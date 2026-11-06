import * as S from '../store.js';
import { $, avatar, closeSheet, esc, icon, reduceMotion, rich, sheet, sheetItem, toast, verified } from '../ui.js';
import { actionsRow, badingImage, card, confirmSheet, wireActions } from '../components.js';
import { STICKERS, THEMES, sticker as builtin, stickerHtml } from '../stickers.js';
import { ACCEPT, openCropper, readImageFile } from '../cropper.js';
import { simulateReply } from '../notify.js';

export function badingView(root, { params, query, go, back }) {
  const id = params.id;
  if (S.get().pendingLink === id) S.setPendingLink(null);
  const b = S.bading(id);
  const header = `<header class="topbar"><button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button><h1 class="t-heading">Bading</h1>${b && !b.deleted ? `<button class="icon-btn" data-a="more" data-id="${id}" aria-label="Plus d'options">${icon('ellipsis')}</button>` : ''}</header>`;

  if (b && !b.deleted && b.authorId !== S.ME) S.addView(id);
  if (!b || b.deleted) {
    root.innerHTML = `${header}<div class="empty"><h2 class="t-title">Ce bading n'est plus disponible.</h2><p class="muted">Son auteur l'a supprimé, ou il a été retiré par la modération.</p><a class="btn btn-secondary" href="#/">Retour au fil</a></div>`;
    $('[data-back]', root).onclick = () => back('/');
    return;
  }

  const { name, handle, user } = S.displayName(b);
  const date = new Date(b.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  let tab = 'comments';
  const open = {}; // repli des fils : true = ouvert, false = replié, absent = auto
  let parent = null;

  root.innerHTML = `${header}
    <section class="bub-hero ${b.anonymous ? 'anon' : ''}" data-hero>
      <div style="display:flex;align-items:center;gap:12px">${avatar(b.anonymous ? null : user, 48)}<div><div style="display:flex;align-items:center;gap:6px"><b style="${b.anonymous ? 'color:var(--text-2)' : ''}">${esc(name)}</b>${user?.verified && !b.anonymous ? verified() : ''}</div>${handle ? `<span class="t-meta">${esc(handle)}</span>` : ''}</div></div>
      ${b.text ? `<p class="t-story" style="font-size:19px">${rich(b.text)}</p>` : ''}
      ${b.image ? `<button class="zoom-img" data-zoom-img aria-label="Agrandir l'image">${badingImage(b, 'full')}</button>` : ''}
      <span class="t-meta">${date}</span>
      <div class="bub-counts" data-counts></div>
      <div data-actions></div>
    </section>
    <div class="tabs" role="tablist"><button role="tab" data-tab="comments"></button><button role="tab" data-tab="rebades"></button><span class="ink"></span></div>
    <div data-panel></div>
    <div class="composer" data-composer>
      <div data-reply hidden style="display:flex;align-items:center;gap:6px;padding:0 4px"><span class="t-small muted" style="flex:1" data-reply-label></span><button class="icon-btn" style="width:28px;height:28px" data-cancel-reply aria-label="Annuler la réponse">${icon('x')}</button></div>
      <div class="sticker-picker" data-picker hidden>
        <div class="sp-tabs" role="tablist">${[THEMES[0], ['mine', 'Mes stickers'], ...THEMES.slice(1)].map(([k, l]) => `<button role="tab" data-st-tab="${k}">${l}</button>`).join('')}</div>
        <div class="sp-grid" data-st-grid></div>
      </div>
      <div class="row">${avatar(S.me(), 32)}<textarea rows="1" maxlength="600" placeholder="Ton commentaire…" aria-label="Ton commentaire"></textarea><button class="icon-btn sticker-btn" data-st-open aria-label="Envoyer un sticker" aria-expanded="false">${icon('sticker')}</button><button class="btn btn-primary btn-sm" data-send disabled>Publier</button></div>
      <p class="error" data-cerr hidden></p>
    </div>`;

  const counts = () => {
    const nb = S.commentCount(id), rebades = S.feed().filter((r) => r.rebadeOf === id && r.text);
    $('[data-counts]', root).innerHTML = `<span class="t-meta"><b style="color:var(--text)">${S.compact(S.bading(id).likes)}</b> rires</span><span class="t-meta"><b style="color:var(--text)">${S.compact(nb)}</b> commentaires</span><span class="t-meta"><b style="color:var(--text)">${S.compact(S.bading(id).rebades)}</b> rebades</span>${S.bading(id).authorId === S.ME ? `<span class="t-meta"><b style="color:var(--text)">${S.compact(S.bading(id).views || 0)}</b> vues</span>` : ''}`;
    $('[data-tab="comments"]', root).textContent = `Commentaires${nb ? ` · ${nb}` : ''}`;
    $('[data-tab="rebades"]', root).textContent = `Rebades avec avis${rebades.length ? ` · ${rebades.length}` : ''}`;
    return rebades;
  };
  const actions = () => { $('[data-actions]', root).innerHTML = actionsRow(S.bading(id)); };
  const moveInk = () => {
    const t = $(`[data-tab="${tab}"]`, root), ink = $('.ink', root);
    root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    gsap.to(ink, { x: t.offsetLeft + t.offsetWidth / 2 - 28, width: 56, duration: reduceMotion() ? 0 : 0.4, ease: 'expo.out' });
  };

  // ─── Commentaires ─────────────────────────────────────
  const commentHtml = (c, reply) => {
    const u = S.user(c.authorId), mine = c.authorId === S.ME;
    return `<div class="comment ${reply ? 'reply' : ''}" data-c="${c.id}">
      ${avatar(u ?? null, reply ? 28 : 36)}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
        <div style="display:flex;align-items:center;gap:6px"><b style="font-size:14px">${esc(u?.pseudo ?? 'Badeur')}</b>${u?.verified ? verified() : ''}<span class="t-small" style="color:var(--text-3)">· ${S.timeAgo(c.createdAt)}</span></div>
        ${c.replyTo ? `<span class="t-small" style="color:var(--text-3)">en réponse à <span class="mention">@${esc(c.replyTo)}</span></span>` : ''}
        ${c.sticker ? `<button class="c-sticker" data-c-a="sticker" aria-label="Ajouter ce sticker à mes stickers">${stickerHtml(c.sticker, reply ? 104 : 120)}</button>` : `<p style="overflow-wrap:anywhere">${rich(c.text)}</p>`}
        <div class="c-actions">
          <button data-c-a="like" class="${c.likedByMe ? 'on' : ''}" aria-label="${c.likedByMe ? 'Retirer mon rire' : 'Rire à ce commentaire'}">${icon('laugh')}${c.likes ? c.likes : ''}</button>
          <button data-c-a="reply">Répondre</button>
          ${mine ? `<button data-c-a="delete" aria-label="Supprimer mon commentaire">${icon('trash')}Supprimer</button>` : `<button data-c-a="report" aria-label="Signaler ce commentaire">${icon('flag')}</button>`}
        </div>
      </div></div>`;
  };
  const drawComments = () => {
    const threads = S.threads(id);
    if (!threads.length) return `<div class="empty" style="align-items:center;text-align:center"><h2 class="t-heading">Pas encore de commentaire</h2><p class="muted">Lance la discussion, dis ce que ça t'a fait.</p></div>`;
    return `<div style="padding:16px;display:flex;flex-direction:column;gap:24px">${threads.map(({ root: r, replies }) => {
      const mineIn = r.authorId === S.ME || replies.some((x) => x.authorId === S.ME);
      const state = open[r.id], collapsed = state === false, expanded = state ?? mineIn;
      const shown = collapsed ? [] : expanded ? replies : replies.slice(0, 2);
      const hidden = replies.length - shown.length;
      const branches = [...shown.map((x) => `<div class="branch">${commentHtml(x, true)}</div>`),
        hidden > 0 ? `<div class="branch"><button class="link-btn" data-t-open="${r.id}">${collapsed ? `▸ Afficher ${replies.length > 1 ? `les ${replies.length} réponses` : 'la réponse'}` : hidden > 1 ? `Voir les ${hidden} autres réponses` : 'Voir 1 autre réponse'}</button></div>` : '',
        replies.length && !collapsed && hidden === 0 ? `<div class="branch"><button class="link-btn" style="color:var(--text-3)" data-t-close="${r.id}">▾ Masquer les réponses</button></div>` : ''].filter(Boolean);
      return `<div class="thread">${branches.length ? '<span class="rail-line"></span>' : ''}${commentHtml(r, false)}${branches.join('')}</div>`;
    }).join('')}</div>`;
  };
  const layoutRails = () => root.querySelectorAll('.thread').forEach((t) => {
    const rail = t.querySelector('.rail-line'); const last = [...t.querySelectorAll(':scope > .branch')].pop();
    if (rail && last) rail.style.height = `${Math.max(0, last.offsetTop + 2 - 40)}px`;
  });
  const panel = () => {
    const rebades = counts();
    const p = $('[data-panel]', root);
    p.innerHTML = tab === 'comments' ? drawComments() : rebades.length ? rebades.map(card).join('') : `<p class="muted" style="padding:16px">Pas encore de rebade avec avis. Sois le premier à donner le tien.</p>`;
    layoutRails();
  };
  counts(); actions(); panel(); requestAnimationFrame(moveInk);
  addEventListener('resize', layoutRails);

  root.querySelectorAll('[data-tab]').forEach((t) => (t.onclick = () => { tab = t.dataset.tab; moveInk(); panel(); }));
  $('[data-back]', root).onclick = () => back('/');
  wireActions(root, go);
  root.addEventListener('changed', () => go('/', { replace: true }));
  const orig = $('[data-actions]', root);
  orig.addEventListener('click', (e) => { if (e.target.closest('[data-a="comment"]')) { e.stopPropagation(); ta.focus(); } }, true);

  $('[data-panel]', root).addEventListener('click', (e) => {
    const o = e.target.closest('[data-t-open]'), cl = e.target.closest('[data-t-close]');
    if (o) { open[o.dataset.tOpen] = true; return panel(); }
    if (cl) { open[cl.dataset.tClose] = false; return panel(); }
    const a = e.target.closest('[data-c-a]'); if (!a) return;
    const c = S.get().comments.find((x) => x.id === a.closest('[data-c]').dataset.c);
    if (a.dataset.cA === 'like') { S.toggleCommentLike(c.id); panel(); }
    if (a.dataset.cA === 'sticker') openStickerSheet(c.sticker);
    if (a.dataset.cA === 'reply') { parent = c; $('[data-reply]', root).hidden = false; $('[data-reply-label]', root).innerHTML = `Réponse à <span class="mention">@${esc(S.user(c.authorId)?.pseudo)}</span>`; ta.placeholder = 'Ta réponse…'; ta.focus(); }
    if (a.dataset.cA === 'report') { const p = sheet({ title: 'Signaler ce commentaire', html: ['Haine', 'Harcèlement', 'Spam', 'Autre'].map((r) => sheetItem('r', r)).join('') }); p.onclick = (ev) => { if (ev.target.closest('[data-act]')) { closeSheet(); toast('Merci, la modération va regarder ça.'); } }; }
    if (a.dataset.cA === 'delete') {
      const hasReplies = !c.parentId && S.threads(id).some((t) => t.root.id === c.id && t.replies.length);
      confirmSheet('Supprimer ce commentaire ?', `${hasReplies ? 'Les réponses à ce commentaire seront aussi supprimées. ' : ''}C'est définitif.`, 'Supprimer', () => {
        const el = root.querySelector(`[data-c="${c.id}"]`);
        const finish = () => { S.removeComment(c.id); panel(); toast('Commentaire supprimé'); };
        if (el && !reduceMotion()) gsap.to(el, { opacity: 0, height: 0, x: -20, duration: 0.3, ease: 'power2.in', onComplete: finish }); else finish();
      });
    }
  });

  // ─── Saisie ───────────────────────────────────────────
  const ta = $('[data-composer] textarea', root), send = $('[data-send]', root), cerr = $('[data-cerr]', root);
  const cancelReply = () => { parent = null; $('[data-reply]', root).hidden = true; ta.placeholder = "Ton commentaire…"; };
  $('[data-cancel-reply]', root).onclick = cancelReply;
  ta.oninput = () => {
    ta.style.height = 'auto'; ta.style.height = `${Math.min(120, ta.scrollHeight)}px`;
    const n = ta.value.length, over = n > S.RULES.commentMax;
    send.disabled = !ta.value.trim() || over; cerr.hidden = !over; cerr.textContent = `${S.RULES.commentMax} caractères maximum (${n}).`;
  };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send.click(); };
  // ─── Stickers (F8) : un toucher = envoi direct ───
  const picker = $('[data-picker]', root), stBtn = $('[data-st-open]', root);
  let stTab = (S.get().recentStickers || []).length ? 'recent' : 'mine';
  const drawStickers = () => {
    const st = S.get();
    const ids = (stTab === 'recent' ? st.recentStickers || [] : stTab === 'mine' ? st.myStickers || [] : STICKERS.filter((x) => x.theme === stTab).map((x) => x.id)).filter((sid) => !S.customSticker(sid)?.removed);
    root.querySelectorAll('[data-st-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.stTab === stTab)));
    const mineTab = root.querySelector('[data-st-tab="mine"]'); if (mineTab) mineTab.textContent = (st.myStickers || []).length ? `Mes stickers · ${S.compact(st.myStickers.length)}` : 'Mes stickers';
    const create = stTab === 'mine' ? `<label class="sp-create" title="Créer un sticker à partir d'une photo">${icon('plus')}<span>Créer</span><input type="file" accept="${ACCEPT}" data-st-file hidden/></label>` : '';
    const items = ids.map((sid) => `<div class="sp-cell"><button class="sp-item" data-st="${sid}" aria-label="Envoyer ce sticker">${stickerHtml(sid, 92)}</button>${stTab === 'mine' ? `<button class="sp-remove" data-st-rm="${sid}" aria-label="Retirer de mes stickers">${icon('x')}</button>` : ''}</div>`).join('');
    const empty = stTab === 'mine' ? (ids.length ? '' : '<p class="t-small muted sp-empty">Crée un sticker avec une photo, ou touche le sticker d’un Badeur dans les commentaires pour l’ajouter ici.</p>') : ids.length ? '' : '<p class="t-small muted sp-empty">Tes stickers récents apparaîtront ici.</p>';
    $('[data-st-grid]', root).innerHTML = create + items + empty;
    $('[data-st-file]', root)?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; e.target.value = '';
      try {
        const src = await readImageFile(file);
        const r = await openCropper(src, {}, { ratios: ['1:1'], outMax: 512, title: 'Créer un sticker' }); if (!r) return;
        const made = S.createSticker(r.dataUrl);
        if (!made.ok) return toast(made.error === 'full' ? `${S.compact(S.RULES.myStickersMax)} stickers maximum : retire-en un d’abord.` : 'Plus de place dans ce navigateur pour un nouveau sticker : retire-en quelques-uns.');
        stTab = 'mine'; drawStickers(); toast('Sticker créé et ajouté à tes stickers');
      } catch (x) { if (x.message !== 'none') toast(x.message); }
    });
  };
  // Comme sur TikTok : toucher un sticker dans un commentaire pour l'ajouter à sa collection.
  const openStickerSheet = (sid) => {
    const c = S.customSticker(sid), owner = c ? S.user(c.ownerId) : null, mine = S.get().myStickers.includes(sid);
    const who = builtin(sid) ? 'Sticker On Bade' : c?.ownerId === S.ME ? 'Ton sticker' : `Sticker créé par @${esc(owner?.pseudo ?? 'un Badeur')}`;
    const action = builtin(sid) ? '<p class="muted" style="text-align:center">Il est déjà dans ta bibliothèque de stickers.</p>'
      : c?.removed ? '' : mine ? '<p class="muted" style="text-align:center">Il est déjà dans tes stickers.</p>'
      : `<button class="btn btn-primary btn-block" data-save-st>${icon('bookmark')} Ajouter à mes stickers</button>`;
    const p = sheet({ html: `<div class="pad" style="display:flex;flex-direction:column;align-items:center;gap:16px">${stickerHtml(sid, 150)}<span class="t-small" style="color:var(--text-3)">${who}</span>${action}</div>` });
    p.querySelector('[data-save-st]')?.addEventListener('click', () => {
      const r = S.saveSticker(sid); closeSheet();
      toast(r === 'full' ? `${S.compact(S.RULES.myStickersMax)} stickers maximum : retire-en un d’abord.` : 'Ajouté à tes stickers');
    });
  };
  const togglePicker = (show = picker.hidden) => {
    picker.hidden = !show; stBtn.setAttribute('aria-expanded', String(show)); stBtn.classList.toggle('on', show);
    if (show) { drawStickers(); if (!reduceMotion()) gsap.from(picker, { y: 12, opacity: 0, duration: 0.25, ease: 'expo.out' }); }
  };
  stBtn.onclick = () => togglePicker();
  root.querySelectorAll('[data-st-tab]').forEach((t) => (t.onclick = () => { stTab = t.dataset.stTab; drawStickers(); }));
  $('[data-st-grid]', root).onclick = (e) => {
    const rm = e.target.closest('[data-st-rm]')?.dataset.stRm;
    if (rm) { S.unsaveSticker(rm); drawStickers(); toast('Retiré de tes stickers'); return; }
    const sid = e.target.closest('[data-st]')?.dataset.st; if (!sid) return;
    togglePicker(false); posted(S.addComment(id, '', parent ?? undefined, sid));
  };
  const posted = (c) => {
    if (!c) return;
    cancelReply(); tab = 'comments'; moveInk(); panel();
    const el = root.querySelector(`[data-c="${c.id}"]`);
    if (el) { el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); gsap.from(el, { backgroundColor: 'rgba(152,16,230,.25)', duration: 1.2 }); const st = el.querySelector('.stk'); if (st && !reduceMotion()) gsap.from(st, { scale: 0.4, rotation: -20, duration: 0.6, ease: 'back.out(2.2)' }); }
    simulateReply(c);
  };
  send.onclick = () => {
    const c = S.addComment(id, ta.value, parent ?? undefined); if (!c) { cerr.textContent = 'Ce commentaire contient un mot refusé par la charte.'; cerr.hidden = false; return; }
    ta.value = ''; ta.oninput(); posted(c);
  };
  $('[data-zoom-img]', root)?.addEventListener('click', () => {
    const lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Image en grand');
    lb.innerHTML = `<img src="${b.image.src}" alt="Image du bading"/><button class="icon-btn" aria-label="Fermer">${icon('x')}</button>`;
    const close = () => { removeEventListener('keydown', onKey); lb.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    lb.onclick = close; addEventListener('keydown', onKey); document.body.appendChild(lb);
    if (!reduceMotion()) gsap.from(lb.querySelector('img'), { scale: 0.92, opacity: 0, duration: 0.3, ease: 'expo.out' });
  });
  if (query.focus === 'comment') setTimeout(() => ta.focus(), 300);

  if (!reduceMotion()) gsap.from('[data-hero] > *', { y: 12, opacity: 0, duration: 0.4, stagger: 0.04, ease: 'expo.out' });
  // Rafraîchit seulement quand un commentaire arrive (réponse simulée) : ne pas re-dessiner
  // les actions, sinon les confettis du rire seraient coupés en plein vol.
  let lastCount = S.commentCount(id);
  const unsub = S.subscribe(() => {
    counts();
    const n = S.commentCount(id);
    if (n !== lastCount) { lastCount = n; if (tab === 'comments') panel(); }
  });
  return () => { unsub(); removeEventListener('resize', layoutRails); };
}
