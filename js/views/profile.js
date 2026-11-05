import * as S from '../store.js';
import { $, avatar, closeSheet, countUp, esc, icon, reduceMotion, sheet, toast, verified } from '../ui.js';
import { faceSvg, facePalette } from '../faces.js';
import { card, wireActions } from '../components.js';

const TABS = [{ k: 'public', label: 'Badings' }, { k: 'fav', label: 'Favoris', lock: true }, { k: 'anon', label: 'Anonymes', lock: true }];
const EMPTY = {
  public: ['Aucun bading signé pour l’instant', 'Raconte ta dernière galère, on t’écoute.', '<a class="btn btn-primary btn-sm" href="#/compose">Écrire un bading</a>'],
  fav: ['Pas encore de favoris', 'Touche le marque-page sous un bading pour le garder ici.', '<a class="btn btn-secondary btn-sm" href="#/">Parcourir le fil</a>'],
  anon: ['Aucun bading anonyme', 'Active « Publier en anonyme » quand tu écris pour cacher ton pseudo.', '<a class="btn btn-primary btn-sm" href="#/compose">Écrire un bading</a>'],
};

export function profileView(root, { go }) {
  let tab = 'public';
  const me = () => S.me();
  const mine = () => S.feed().filter((b) => b.authorId === S.ME);
  // Stats publiques = badings signés uniquement (F4 RG2 : l'anonymat ne fuit pas par les chiffres)
  const pub = () => mine().filter((b) => !b.anonymous);

  const head = () => {
    const u = me(), p = pub();
    const joined = new Date(u.joinedAt ?? Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `
    <header class="topbar"><h1 class="t-heading" style="flex:1">${esc(u.pseudo)}</h1><a class="icon-btn" href="#/settings" aria-label="Paramètres">${icon('settings')}</a></header>
    <section style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <button data-avatar aria-label="Changer d'avatar" style="align-self:flex-start;position:relative;border-radius:50%">
        <span style="display:block;border:3px solid var(--bg);border-radius:50%">${avatar(u, 88)}</span>
        <span style="position:absolute;right:0;bottom:2px;width:30px;height:30px;border-radius:50%;background:var(--brand);border:3px solid var(--bg);display:grid;place-items:center;color:#fff">${icon('pencil').replace('class="i ', 'style="width:13px;height:13px;stroke-width:2.6" class="i ')}</span>
      </button>
      <div><div style="display:flex;align-items:center;gap:8px"><span class="t-title">${esc(u.pseudo)}</span>${u.verified ? verified() : ''}</div><span class="t-meta">@${esc(u.pseudo)} · Badeur depuis ${joined}</span></div>
      <div class="stats">
        <div class="stat hero"><b data-cu="${p.reduce((s, b) => s + b.likes, 0)}">0</b><span>${icon('laugh')}rires</span></div>
        <div class="stat"><b data-cu="${p.reduce((s, b) => s + b.rebades, 0)}">0</b><span>${icon('repeat')}rebades</span></div>
        <div class="stat"><b data-cu="${p.reduce((s, b) => s + b.shares, 0)}">0</b><span>${icon('share')}partages</span></div>
        <div class="stat"><b data-cu="${p.filter((b) => !b.rebadeOf).length}">0</b><span>${icon('penLine')}badings</span></div>
      </div>
    </section>
    <div class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" data-tab="${t.k}">${t.lock ? icon('lock') : ''}${t.label}${t.k === 'fav' && S.get().favorites.length ? ` <span class="t-small" style="color:var(--text-3)">${S.get().favorites.length}</span>` : ''}</button>`).join('')}<span class="ink"></span></div>
    <div data-list></div>`;
  };

  const list = () => {
    const data = tab === 'public' ? pub() : tab === 'fav' ? S.get().favorites.map(S.bading).filter((b) => b && !b.deleted) : mine().filter((b) => b.anonymous);
    const note = tab === 'fav' ? 'Tes badings mis de côté. Visible par toi seul.' : tab === 'anon' ? 'Visible par toi seul. Sur ton profil public, personne ne peut relier ces badings à toi.' : '';
    const [t, b, cta] = EMPTY[tab];
    $('[data-list]', root).innerHTML = (note ? `<p class="t-meta" style="padding:16px;border-bottom:1px solid var(--line);color:var(--text-2)">${note}</p>` : '') +
      (data.length ? data.map(card).join('') : `<div class="empty"><h2 class="t-heading">${t}</h2><p class="muted">${b}</p>${cta}</div>`);
    if (!reduceMotion()) gsap.from(root.querySelectorAll('[data-list] .card-row'), { y: 10, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'expo.out', clearProps: 'all' });
  };
  const ink = () => {
    const t = $(`[data-tab="${tab}"]`, root);
    root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    gsap.to($('.ink', root), { x: t.offsetLeft + t.offsetWidth / 2 - 28, width: 56, duration: reduceMotion() ? 0 : 0.45, ease: 'expo.out' });
  };
  const draw = () => {
    root.innerHTML = head();
    root.querySelectorAll('[data-cu]').forEach((el) => countUp(el, Number(el.dataset.cu)));
    root.querySelectorAll('[data-tab]').forEach((t) => (t.onclick = () => { tab = t.dataset.tab; ink(); list(); }));
    $('[data-avatar]', root).onclick = openPicker;
    list(); requestAnimationFrame(ink);
  };
  wireActions(root, go);
  root.addEventListener('changed', draw);
  draw();

  function openPicker() {
    let palette = facePalette(), sel = null;
    const p = sheet({ title: 'Choisis ton avatar', html: `<div class="pad">
      <div style="display:flex;align-items:center;gap:16px"><span data-prev style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--brand);flex:none;display:grid;place-items:center">${avatar(me(), 68)}</span><p class="muted">Ta tête de Badeur, visible sur ton profil et tes badings signés. Jamais sur tes badings anonymes.</p></div>
      <div class="faces" role="radiogroup" data-faces></div>
      <div style="display:flex;gap:12px"><button class="btn btn-secondary" data-shuffle>${icon('shuffle')} Mélanger</button><button class="btn btn-primary" style="flex:1" data-pick disabled>Choisir</button></div>
    </div>` });
    const grid = p.querySelector('[data-faces]');
    const paint = () => {
      grid.innerHTML = palette.map((a, i) => `<button role="radio" aria-checked="${sel === i}" aria-label="Avatar ${i + 1}" data-i="${i}">${faceSvg(a)}</button>`).join('');
      if (!reduceMotion()) gsap.from(grid.children, { scale: 0.6, opacity: 0, duration: 0.35, stagger: 0.02, ease: 'back.out(2)' });
    };
    paint();
    grid.onclick = (e) => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      sel = Number(b.dataset.i);
      grid.querySelectorAll('[data-i]').forEach((x) => x.setAttribute('aria-checked', String(Number(x.dataset.i) === sel)));
      const prev = p.querySelector('[data-prev]'); prev.innerHTML = `<span style="width:68px;height:68px;display:block">${faceSvg(palette[sel])}</span>`;
      gsap.fromTo(prev.firstElementChild, { scale: 0.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      p.querySelector('[data-pick]').disabled = false;
    };
    p.querySelector('[data-shuffle]').onclick = () => { palette = facePalette(); sel = null; p.querySelector('[data-pick]').disabled = true; paint(); };
    p.querySelector('[data-pick]').onclick = () => { S.setAvatar(palette[sel]); closeSheet(); toast('Nouvel avatar enregistré'); draw(); };
  }
}
