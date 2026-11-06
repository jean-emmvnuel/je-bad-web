import { ICONS } from './icons-data.js';

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

export const LOGO_PATHS = '<path d="M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z"/><path fill-rule="evenodd" d="M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z M104 146H188A42 42 0 0 1 104 146Z"/>';
export const logo = (size = 28, color = '#9810e6') => `<svg viewBox="0 0 256 256" width="${size}" height="${size}" fill="${color}" role="img" aria-label="On Bade">${LOGO_PATHS}</svg>`;

/** Le logo avec une bouche qui peut s'ouvrir (pull-to-refresh, splash). */
export const laughingMark = (size = 44) => `<svg viewBox="0 0 256 256" width="${size}" height="${size}" aria-hidden="true">
  <path d="M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z" fill="#9810e6"/><path d="M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z" fill="#9810e6"/>
  <g class="mouth" style="transform-origin:57% 57%;transform-box:view-box">
    <path d="M104 146H188A42 42 0 0 1 104 146Z" fill="#1a1919"/><path d="M124.4 182A21.6 14 0 0 1 167.6 182A42 42 0 0 1 124.4 182Z" fill="#FF6FA8"/>
    <path d="M110 146H127V155a4 4 0 0 1-4 4H114a4 4 0 0 1-4-4Z M129 146H146V155a4 4 0 0 1-4 4H133a4 4 0 0 1-4-4Z M148 146H165V155a4 4 0 0 1-4 4H152a4 4 0 0 1-4-4Z M167 146H184V155a4 4 0 0 1-4 4H171a4 4 0 0 1-4-4Z" fill="#fff"/>
  </g></svg>`;

export const verified = () => `<svg class="verified" viewBox="0 0 24 24" aria-label="Compte vérifié"><path d="${'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'}" fill="#9810e6"/><path d="m16 9-5.5 5.5L8 12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function avatar(u, size = 44) {
  const s = `width:${size}px;height:${size}px`;
  if (!u) return `<span class="avatar anon" style="${s}" role="img" aria-label="Badeur anonyme">${icon('mask').replace('class="i ', `style="width:${size * 0.5}px;height:${size * 0.5}px" class="i `)}</span>`;
  // Photo de profil importée (recadrée en carré) ; sinon l'initiale sur une couleur.
  if (u.photo) return `<span class="avatar" style="${s}" role="img" aria-label="${esc(u.pseudo)}"><img src="${u.photo}" alt="" draggable="false"/></span>`;
  return `<span class="avatar" style="${s};background:hsl(${u.hue},38%,30%);color:hsl(${u.hue},80%,86%);font-size:${size * 0.42}px" role="img" aria-label="${esc(u.pseudo)}">${esc(u.pseudo[0]?.toUpperCase())}</span>`;
}

/** Texte avec @mentions colorées. */
export const rich = (t) => esc(t).replace(/(@[\w.]+)/g, '<span class="mention">$1</span>');

// ─── Toast ────────────────────────────────────────────────
let toastTimer;
export function toast(msg) {
  const root = $('#toast');
  root.innerHTML = `<div>${esc(msg)}</div>`;
  const el = root.firstElementChild;
  gsap.fromTo(el, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'expo.out' });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => gsap.to(el, { y: 12, opacity: 0, duration: 0.2, onComplete: () => el.remove() }), 2600);
}

// ─── Sheet (feuille du bas / modale sur desktop) ───────────
let openSheet = null;
export function sheet({ title = '', html, onMount }) {
  closeSheet(true);
  const root = $('#sheet-root');
  const desktop = matchMedia('(min-width: 900px)').matches;
  root.innerHTML = `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ''}><div class="grab"></div>${title ? `<h2 class="t-heading">${esc(title)}</h2>` : ''}${html}</div>`;
  const panel = $('.sheet', root), scrim = $('.scrim', root);
  gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(panel, desktop ? { opacity: 0, scale: 0.94 } : { yPercent: 100 }, desktop ? { opacity: 1, scale: 1, duration: 0.35, ease: 'expo.out' } : { yPercent: 0, duration: 0.42, ease: 'expo.out' });
  const onKey = (e) => e.key === 'Escape' && closeSheet();
  document.addEventListener('keydown', onKey);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  openSheet = { panel, scrim, onKey, desktop };
  onMount?.(panel);
  setTimeout(() => panel.querySelector('button, input, textarea')?.focus(), 50);
  return panel;
}
export function closeSheet(instant = false) {
  if (!openSheet) return;
  const { panel, scrim, onKey, desktop } = openSheet; openSheet = null;
  document.removeEventListener('keydown', onKey);
  const root = $('#sheet-root');
  if (instant) { root.innerHTML = ''; return; }
  gsap.to(scrim, { opacity: 0, duration: 0.2 });
  gsap.to(panel, desktop ? { opacity: 0, scale: 0.96, duration: 0.18 } : { yPercent: 100, duration: 0.22, ease: 'power2.in' , onComplete: () => (root.innerHTML = '') });
  if (desktop) setTimeout(() => (root.innerHTML = ''), 200);
}
export const sheetItem = (action, label, { iconName, danger, detail } = {}) =>
  `<button class="item ${danger ? 'danger' : ''}" data-act="${action}">${iconName ? icon(iconName) : ''}<span>${esc(label)}${detail ? `<small>${esc(detail)}</small>` : ''}</span></button>`;

// ─── Confettis (GSAP physics à la main) ───────────────────
const CONFETTI = ['#9810e6', '#B76BFF', '#FFC93C', '#FF6FA8', '#3DDC97', '#EDE3FA'];
export function confetti(host, count = 18) {
  if (reduceMotion() || !host) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const round = i % 4 === 0;
    const w = round ? 6 : 4 + Math.random() * 3, hgt = round ? 6 : 8 + Math.random() * 4;
    Object.assign(p.style, { position: 'absolute', left: `${-w / 2}px`, top: `${-hgt / 2}px`, width: `${w}px`, height: `${hgt}px`, borderRadius: round ? '50%' : '2px', background: CONFETTI[i % CONFETTI.length], pointerEvents: 'none' });
    host.appendChild(p);
    const angle = (-160 + (140 * i) / (count - 1) + (Math.random() * 16 - 8)) * (Math.PI / 180);
    const speed = 70 + Math.random() * 70;
    const tl = gsap.timeline({ onComplete: () => p.remove() });
    tl.to(p, { x: Math.cos(angle) * speed, duration: 0.95, ease: 'power1.out' }, 0)
      .to(p, { y: Math.sin(angle) * speed, duration: 0.45, ease: 'power2.out' }, 0)
      .to(p, { y: `+=${110 + Math.random() * 60}`, duration: 0.5, ease: 'power2.in' }, 0.45)
      .to(p, { rotation: (Math.random() * 2 - 1) * 720, scaleX: round ? 1 : -1, duration: 0.95, ease: 'none' }, 0)
      .to(p, { opacity: 0, duration: 0.3 }, 0.65);
  }
}

/** Nombre qui monte (expo out). */
export function countUp(el, to, duration = 0.9) {
  if (reduceMotion()) { el.textContent = el.dataset.fmt === 'compact' ? compactNum(to) : to; return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration, ease: 'expo.out', onUpdate: () => (el.textContent = compactNum(Math.round(o.v))) });
}
const compactNum = (n) => (n < 1000 ? String(n) : n < 10_000 ? `${(n / 1000).toFixed(1).replace('.0', '')} k` : `${Math.round(n / 1000)} k`);
