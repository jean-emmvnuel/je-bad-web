import * as S from '../store.js';
import { $, avatar, closeSheet, esc, icon, reduceMotion, rich, sheet, sheetItem, toast, verified } from '../ui.js';
import { actionsRow, card, confirmSheet, wireActions } from '../components.js';
import { simulateReply } from '../notify.js';

export function badingView(root, { params, query, go, back }) {
  const id = params.id;
  if (S.get().pendingLink === id) S.setPendingLink(null);
  const b = S.bading(id);
  const header = `<header class="topbar"><button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button><h1 class="t-heading">Bading</h1>${b && !b.deleted ? `<button class="icon-btn" data-a="more" data-id="${id}" aria-label="Plus d'options">${icon('ellipsis')}</button>` : ''}</header>`;

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
    <section style="padding:16px;display:flex;flex-direction:column;gap:16px" data-hero>
      <div style="display:flex;align-items:center;gap:12px">${avatar(b.anonymous ? null : user, 48)}<div><div style="display:flex;align-items:center;gap:6px"><b style="${b.anonymous ? 'color:var(--text-2)' : ''}">${esc(name)}</b>${user?.verified && !b.anonymous ? verified() : ''}</div>${handle ? `<span class="t-meta">${esc(handle)}</span>` : ''}</div></div>
      <p class="t-story" style="font-size:19px">${rich(b.text)}</p>
      <span class="t-meta">${date}</span>
      <div style="display:flex;gap:24px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)" data-counts></div>
      <div data-actions></div>
    </section>
    <div class="tabs" role="tablist"><button role="tab" data-tab="comments"></button><button role="tab" data-tab="rebades"></button><span class="ink"></span></div>
    <div data-panel></div>
    <div class="composer" data-composer>
      <div data-reply hidden style="display:flex;align-items:center;gap:6px;padding:0 4px"><span class="t-small muted" style="flex:1" data-reply-label></span><button class="icon-btn" style="width:28px;height:28px" data-cancel-reply aria-label="Annuler la réponse">${icon('x')}</button></div>
      <div class="row">${avatar(S.me(), 32)}<textarea rows="1" maxlength="600" placeholder="Ajoute un commentaire…" aria-label="Ton commentaire"></textarea><button class="btn btn-primary btn-sm" data-send disabled>Publier</button></div>
      <p class="error" data-cerr hidden></p>
    </div>`;

  const counts = () => {
    const nb = S.commentCount(id), rebades = S.feed().filter((r) => r.rebadeOf === id && r.text);
    $('[data-counts]', root).innerHTML = `<span class="t-meta"><b style="color:var(--text)">${S.compact(S.bading(id).likes)}</b> rires</span><span class="t-meta"><b style="color:var(--text)">${S.compact(nb)}</b> commentaires</span><span class="t-meta"><b style="color:var(--text)">${S.compact(S.bading(id).rebades)}</b> rebades</span>`;
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
        <p style="overflow-wrap:anywhere">${rich(c.text)}</p>
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
  const cancelReply = () => { parent = null; $('[data-reply]', root).hidden = true; ta.placeholder = 'Ajoute un commentaire…'; };
  $('[data-cancel-reply]', root).onclick = cancelReply;
  ta.oninput = () => {
    ta.style.height = 'auto'; ta.style.height = `${Math.min(120, ta.scrollHeight)}px`;
    const n = ta.value.length, over = n > S.RULES.commentMax;
    send.disabled = !ta.value.trim() || over; cerr.hidden = !over; cerr.textContent = `${S.RULES.commentMax} caractères maximum (${n}).`;
  };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send.click(); };
  send.onclick = () => {
    const c = S.addComment(id, ta.value, parent ?? undefined); if (!c) return;
    ta.value = ''; ta.oninput(); cancelReply(); tab = 'comments'; moveInk(); panel();
    const el = root.querySelector(`[data-c="${c.id}"]`);
    if (el) { el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); gsap.from(el, { backgroundColor: 'rgba(152,16,230,.25)', duration: 1.2 }); }
    simulateReply(c);
  };
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
