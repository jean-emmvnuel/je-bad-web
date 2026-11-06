import * as S from './store.js';
import { $, avatar, closeSheet, confetti, esc, icon, logo, reduceMotion, rich, sheet, sheetItem, toast, verified } from './ui.js';

import { badingUrl } from './pwa.js';

const PUBLIC_HOST = 'https://jebade.app';
/**
 * Lien dynamique : `…/?b=<id>` reste dans la portée de la PWA, donc il s'ouvre dans l'app installée
 * (Android, ordinateur) et sinon sur le site, directement sur le bading. En prod → jebade.app/b/<id>.
 */
export const badingLink = (id) => (location.hostname.endsWith('jebade.app') ? `${PUBLIC_HOST}/b/${id}` : badingUrl(id));
/** Image d'un bading, au ratio choisi au recadrage (hauteur limitée dans le fil). */
export const badingImage = (b, cls = '') => (b?.image ? `<figure class="b-img ${cls}" style="--ratio:${b.image.ratio}"><img src="${b.image.src}" alt="Image du bading" loading="lazy" decoding="async"/></figure>` : '');
const teaser = (t) => (t.length > 140 ? `${t.slice(0, 140).trimEnd()}…` : t);
const shareText = (b, url) => `${b.text ? `« ${teaser(b.text)} »\n\n` : b.image ? '📷 Un bading en image\n\n' : ''}😂 Lis la suite sur On Bade : ${url}`;

// ─── Carte ────────────────────────────────────────────────
function author(b, small = false) {
  const { name, handle, user } = S.displayName(b);
  return `<div class="head">${small ? avatar(b.anonymous ? null : user, 22) : ''}<span class="name" style="${b.anonymous ? 'color:var(--text-2)' : ''}">${esc(name)}</span>${user?.verified && !b.anonymous ? verified() : ''}${handle && !small ? `<span class="handle">${esc(handle)}</span>` : ''}<span class="t-meta">· ${S.timeAgo(b.createdAt)}</span></div>`;
}
export function quoted(id) {
  const q = S.bading(id);
  if (!q || q.deleted) return `<div class="quote"><span class="muted t-meta">Ce bading n'est plus disponible.</span></div>`;
  return `<div class="quote" data-go="/bading/${q.id}" role="link" tabindex="0">${author(q, true)}${q.text ? `<p class="t-story" style="font-size:16px;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden">${rich(q.text)}</p>` : ''}${badingImage(q, 'small')}</div>`;
}
export const actionsRow = (t) => `
  <div class="actions" data-id="${t.id}">
    <button class="act ${t.likedByMe ? 'on' : ''}" data-a="laugh" aria-pressed="${t.likedByMe}" aria-label="Rire, ${t.likes} rires"><span class="confetti-host"></span>${icon('laugh')}<span data-n>${S.compact(t.likes)}</span></button>
    <button class="act" data-a="comment" aria-label="Commenter">${icon('message')}<span>${S.compact(S.commentCount(t.id))}</span></button>
    <button class="act" data-a="rebade" aria-label="Rebader">${icon('repeat')}<span>${S.compact(t.rebades)}</span></button>
    <button class="act" data-a="share" aria-label="Partager">${icon('share')}</button>
    <span class="spacer"></span>
    <button class="act ${S.get().favorites.includes(t.id) ? 'on' : ''}" data-a="fav" aria-pressed="${S.get().favorites.includes(t.id)}" aria-label="Favori">${icon('bookmark')}</button>
  </div>`;

export function card(b) {
  const isRebade = !!b.rebadeOf, plain = isRebade && !b.text;
  const origin = isRebade ? S.bading(b.rebadeOf) : b;
  const t = plain && origin ? origin : b;
  const { user } = S.displayName(b);
  const mine = b.authorId === S.ME;
  const who = b.anonymous ? 'Un Badeur anonyme' : mine ? 'Tu' : `@${user?.pseudo}`;
  return `<article class="card-row" data-card="${t.id}" data-go="/bading/${t.id}" tabindex="0">
    ${avatar(t.anonymous ? null : S.user(t.authorId) ?? null, 44)}
    <div class="body">
      ${plain ? `<div class="rebaded" style="margin-left:0">${icon('repeat')} ${esc(who)} ${mine ? 'as rebadé' : 'a rebadé'}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px">${author(t)}<span class="spacer"></span><button class="icon-btn" style="width:34px;height:34px" data-a="more" data-id="${t.id}" aria-label="Plus d'options">${icon('ellipsis')}</button></div>
      ${plain ? (origin && !origin.deleted ? `${origin.text ? `<p class="t-story">${rich(origin.text)}</p>` : ''}${badingImage(origin)}` : quoted(b.rebadeOf)) : `${b.text ? `<p class="t-story">${rich(b.text)}</p>` : ''}${badingImage(b)}${isRebade ? quoted(b.rebadeOf) : ''}`}
      ${actionsRow(t)}
    </div>
  </article>`;
}

/** Délégation des actions sur toutes les cartes d'un conteneur. */
export function wireActions(root, go) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-a]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
    const b = S.bading(id);
    if (!b) return;
    switch (btn.dataset.a) {
      case 'laugh': {
        const turningOn = !b.likedByMe;
        S.toggleLike(id);
        root.querySelectorAll(`.actions[data-id="${id}"] [data-a="laugh"]`).forEach((el) => {
          el.classList.toggle('on', turningOn); el.setAttribute('aria-pressed', String(turningOn));
          el.querySelector('[data-n]').textContent = S.compact(S.bading(id).likes);
        });
        if (turningOn) {
          confetti(btn.querySelector('.confetti-host'));
          if (!reduceMotion()) gsap.fromTo(btn.querySelector('svg'), { scale: 1.4, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1.1, 0.35)' });
        }
        break;
      }
      case 'comment': go(`/bading/${id}?focus=comment`); break;
      case 'rebade': openRebade(b); break;
      case 'share': openShare(b); break;
      case 'fav': {
        const on = S.toggleFavorite(id);
        btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on));
        if (!reduceMotion()) gsap.fromTo(btn.querySelector('svg'), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        toast(on ? 'Ajouté à tes favoris' : 'Retiré de tes favoris');
        break;
      }
      case 'more': openMore(b, () => root.dispatchEvent(new CustomEvent('changed'))); break;
    }
  });
}

// ─── Menu « … » ───────────────────────────────────────────
const REASONS = ['Haine', 'Harcèlement', 'Contenu choquant', 'Spam', 'Usurpation', 'Autre'];
export function openMore(b, onChange) {
  const mine = b.authorId === S.ME;
  const pseudo = !b.anonymous ? S.user(b.authorId)?.pseudo : null;
  const panel = sheet({ html: `<div>${sheetItem('copy', 'Copier le lien', { iconName: 'link' })}${mine ? sheetItem('delete', 'Supprimer', { iconName: 'trash', danger: true }) : sheetItem('report', 'Signaler', { iconName: 'flag', detail: 'La modération vérifie chaque signalement' }) + (pseudo ? sheetItem('block', `Bloquer @${pseudo}`, { iconName: 'ban', danger: true }) : '')}</div>` });
  panel.onclick = async (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
    if (a === 'copy') { await navigator.clipboard?.writeText(badingLink(b.id)).catch(() => {}); closeSheet(); toast('Lien copié'); }
    if (a === 'report') {
      const p = sheet({ title: 'Pourquoi tu signales ?', html: REASONS.map((r) => sheetItem('r', r)).join('') });
      p.onclick = (ev) => { if (ev.target.closest('[data-act]')) { closeSheet(); toast('Merci, la modération va regarder ça.'); } };
    }
    if (a === 'delete') confirmSheet('Supprimer ce bading ?', "Il disparaît du fil et de ton profil. Les rebades afficheront « Ce bading n'est plus disponible ». C'est définitif.", 'Supprimer', () => { S.remove(b.id); toast('Bading supprimé'); onChange?.(); });
    if (a === 'block') confirmSheet(`Bloquer @${pseudo} ?`, 'Tu ne verras plus ses badings, et il ne pourra plus te mentionner. Tu peux le débloquer dans Paramètres.', 'Bloquer', () => { S.block(b.authorId); toast(`@${pseudo} est bloqué`); onChange?.(); });
  };
}

export function confirmSheet(title, text, label, onYes) {
  const p = sheet({ title, html: `<div class="pad"><p class="muted">${esc(text)}</p><div style="display:flex;gap:12px"><button class="btn btn-secondary btn-sm" style="flex:1" data-close>Annuler</button><button class="btn btn-danger btn-sm" style="flex:1" data-yes>${esc(label)}</button></div></div>` });
  p.querySelector('[data-yes]').onclick = () => { closeSheet(); onYes(); };
}

// ─── Rebade ───────────────────────────────────────────────
export function openRebade(b) {
  const originId = b.rebadeOf ?? b.id;
  const p = sheet({ title: 'Rebade', html: `<div class="pad">
    <div data-choose style="display:flex;flex-direction:column;gap:12px">
      <button class="srow" style="background:var(--surface-2);border-radius:var(--r-lg)" data-direct><span class="icon-btn" style="background:var(--brand-soft);color:var(--brand-ink)">${icon('repeat')}</span><span class="txt"><b>Rebader directement</b><small>Le bading apparaît dans le fil avec ton nom.</small></span></button>
      <button class="srow" style="background:var(--surface-2);border-radius:var(--r-lg)" data-opinion><span class="icon-btn" style="background:var(--brand-soft);color:var(--brand-ink)">${icon('quote')}</span><span class="txt"><b>Avec mon avis</b><small>Ajoute ta réaction, ${S.RULES.opinionMax} caractères max.</small></span></button>
    </div>
    <div data-form hidden style="display:flex;flex-direction:column;gap:8px"><textarea class="plain" rows="3" maxlength="400" placeholder="Ton avis (facultatif)" aria-label="Ton avis"></textarea><span class="t-small muted" data-count style="align-self:flex-end">0 / ${S.RULES.opinionMax}</span></div>
    ${quoted(originId)}
    <div style="display:flex;align-items:center;gap:12px"><span class="muted">${icon('mask')}</span><span class="t-label" style="flex:1">Rebader en anonyme</span><button class="toggle" role="switch" aria-checked="false" aria-label="Rebader en anonyme" data-anon><i></i></button></div>
    <button class="btn btn-primary btn-block" data-send hidden>Rebader</button>
  </div>` });
  const anon = p.querySelector('[data-anon]'), ta = p.querySelector('textarea'), send = p.querySelector('[data-send]');
  anon.onclick = () => anon.setAttribute('aria-checked', String(anon.getAttribute('aria-checked') !== 'true'));
  const done = (text) => { S.rebade(originId, text, anon.getAttribute('aria-checked') === 'true'); closeSheet(); toast('Rebadé ! L’auteur est prévenu.'); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  p.querySelector('[data-direct]').onclick = () => done('');
  p.querySelector('[data-opinion]').onclick = () => { p.querySelector('[data-choose]').hidden = true; p.querySelector('[data-form]').hidden = false; send.hidden = false; ta.focus(); };
  ta.oninput = () => { const n = ta.value.length; const c = p.querySelector('[data-count]'); c.textContent = `${n} / ${S.RULES.opinionMax}`; c.style.color = n > S.RULES.opinionMax ? 'var(--danger)' : ''; send.disabled = n > S.RULES.opinionMax; };
  send.onclick = () => done(ta.value);
}

// ─── Partage ──────────────────────────────────────────────
export function openShare(target) {
  const b = target.rebadeOf ? S.bading(target.rebadeOf) ?? target : target;
  const url = badingLink(b.id), msg = shareText(b, url);
  const { name, user } = S.displayName(b);
  const T = (k, label, bg, inner) => `<button data-t="${k}" style="display:flex;flex-direction:column;align-items:center;gap:6px;width:64px"><span style="width:54px;height:54px;border-radius:50%;background:${bg};display:grid;place-items:center;color:#fff">${inner}</span><span class="t-small muted" style="text-align:center">${label}</span></button>`;
  const p = sheet({ title: 'Partager ce bading', html: `<div class="pad">
    <div style="background:var(--brand);padding:14px;border-radius:var(--r-lg)">
      <div style="background:var(--bg);border-radius:var(--r-md);padding:16px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">${avatar(b.anonymous ? null : user, 30)}<b style="${b.anonymous ? 'color:var(--text-2)' : ''}">${esc(name)}</b></div>
        ${b.text ? `<p style="font-weight:600;font-size:18px;line-height:25px;display:-webkit-box;-webkit-line-clamp:${b.image ? 3 : 9};-webkit-box-orient:vertical;overflow:hidden">${esc(b.text)}</p>` : ''}${b.image ? `<img src="${b.image.src}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:var(--r-md)"/>` : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 4px 0;color:#fff"><span style="display:flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:800;font-size:17px">${logo(22, '#fff')} on bade</span><span class="t-small" style="color:#F1E4FF">jebade.app</span></div>
    </div>
    <div style="display:flex;justify-content:space-between">
      ${T('wa', 'WhatsApp', '#25D366', icon('message'))}
      ${T('fb', 'Facebook', '#1877F2', '<b style="font-family:var(--font-display);font-size:28px">f</b>')}
      ${T('img', 'En image', 'var(--brand)', icon('image'))}
      ${T('copy', 'Copier le lien', 'var(--surface-2)', icon('copy'))}
      ${T('more', 'Autres', 'var(--surface-2)', icon('ellipsis'))}
    </div>
    <p class="t-small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(url)}</p>
  </div>` });
  const done = (m) => { S.share(b.id); closeSheet(); toast(m); };
  p.onclick = async (e) => {
    const k = e.target.closest('[data-t]')?.dataset.t; if (!k) return;
    if (k === 'wa') { open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); done('Envoyé vers WhatsApp'); }
    if (k === 'fb') { open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener'); done('Ouvert dans Facebook'); }
    if (k === 'copy') { await navigator.clipboard?.writeText(url).catch(() => {}); done('Lien copié'); }
    if (k === 'more') {
      if (navigator.share) { try { await navigator.share({ text: msg, url }); done('Partagé'); } catch {} }
      else { await navigator.clipboard?.writeText(msg).catch(() => {}); done('Texte copié, colle-le où tu veux'); }
    }
    if (k === 'img') {
      const blob = await renderShareImage(b);
      const file = new File([blob], `on-bade-${b.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: url }); done('Image partagée'); return; } catch {} }
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); done('Image téléchargée');
    }
  };
}

/** Dessine la carte de partage (1080×1350) : anonyme reste anonyme (F3 RG4). */
async function renderShareImage(b) {
  await document.fonts.ready;
  const W = 1080, H = 1350, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  g.fillStyle = '#9810e6'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1a1919'; rr(60, 60, W - 120, H - 260, 48); g.fill();
  const { name } = S.displayName(b);
  g.fillStyle = b.anonymous ? '#A9A4A4' : '#F4F1F1'; g.font = '700 44px Figtree';
  g.fillText(name, 120, 170);
  g.fillStyle = '#F4F1F1'; g.font = '600 52px Figtree';
  const words = b.text ? b.text.split(/\s+/) : []; let line = '', y = 280; const maxW = W - 240, lh = 72, maxY = b.image ? 280 + lh * 2 : H - 300;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW) { g.fillText(line, 120, y); line = w; y += lh; if (y > maxY) { line = '…'; break; } } else line = test;
  }
  if (line && y <= maxY + lh) g.fillText(line, 120, y);
  if (b.image) {
    // Image du bading recadrée en « cover » dans la zone restante de la carte.
    const im = new Image(); im.src = b.image.src; await im.decode().catch(() => {});
    const top = words.length ? y + 50 : 220, bx = 120, bw = W - 240, bh = H - 300 - top;
    const r = Math.max(bw / im.naturalWidth, bh / im.naturalHeight), sw = bw / r, sh = bh / r;
    g.save(); rr(bx, top, bw, bh, 28); g.clip();
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, bx, top, bw, bh); g.restore();
  }
  const logoImg = new Image(); logoImg.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#fff"><path d="M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z"/><path fill-rule="evenodd" d="M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z M104 146H188A42 42 0 0 1 104 146Z"/></svg>`)}`;
  await logoImg.decode().catch(() => {});
  g.drawImage(logoImg, 70, H - 160, 90, 90);
  g.fillStyle = '#fff'; g.font = '800 64px "Bricolage Grotesque"'; g.fillText('on bade', 175, H - 95);
  g.fillStyle = '#F1E4FF'; g.font = '500 40px Figtree'; g.textAlign = 'right'; g.fillText('jebade.app', W - 70, H - 100);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
