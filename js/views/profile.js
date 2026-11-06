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
    <header class="topbar"><h1 class="t-heading" style="flex:1">Profil</h1><a class="icon-btn" href="#/settings" aria-label="Paramètres">${icon('settings')}</a></header>
    <section class="profile-hero pf-card">
      <button class="pf-avatar" data-avatar aria-label="Changer d'avatar">
        ${avatar(u, 96)}
        <span class="pf-edit">${icon('pencil')}</span>
      </button>
      <div class="pf-name"><span class="t-title">${esc(u.pseudo)}</span>${u.verified ? verified() : ''}</div>
      <span class="t-meta">@${esc(u.pseudo)} · Badeur depuis ${joined}</span>
      <div class="pf-stats">
        <div><b data-cu="${p.filter((b) => !b.rebadeOf).length}">0</b><span>badings</span></div>
        <div><b data-cu="${p.reduce((s, b) => s + b.likes, 0)}">0</b><span>rires</span></div>
        <div><b data-cu="${p.reduce((s, b) => s + b.rebades, 0)}">0</b><span>rebades</span></div>
        <div><b data-cu="${p.reduce((s, b) => s + b.shares, 0)}">0</b><span>partages</span></div>
      </div>
      <button class="btn btn-secondary btn-sm pf-btn" data-avatar2>${icon('pencil')} Changer mon avatar</button>
    </section>
    <div class="pf-tabs" role="tablist">${TABS.map((t) => `<button role="tab" data-tab="${t.k}">${t.lock ? icon('lock') : ''}${t.label}${t.k === 'fav' && S.get().favorites.length ? ` <span class="pf-count">${S.get().favorites.length}</span>` : ''}</button>`).join('')}</div>
    <div data-list></div>`;
  };

  const list = () => {
    const data = tab === 'public' ? pub() : tab === 'fav' ? S.get().favorites.map(S.bading).filter((b) => b && !b.deleted) : mine().filter((b) => b.anonymous);
    const note = tab === 'fav' ? 'Tes badings mis de côté. Visible par toi seul.' : tab === 'anon' ? 'Visible par toi seul. Sur ton profil public, personne ne peut relier ces badings à toi.' : '';
    const [t, b, cta] = EMPTY[tab];
    $('[data-list]', root).innerHTML = (note ? `<p class="pf-note">${icon('lock')}<span>${note}</span></p>` : '') +
      (data.length ? data.map(card).join('') : `<div class="empty"><h2 class="t-heading">${t}</h2><p class="muted">${b}</p>${cta}</div>`);
    if (!reduceMotion()) gsap.from(root.querySelectorAll('[data-list] .card-row'), { y: 10, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'expo.out', clearProps: 'all' });
  };
  const ink = () => {
    root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === tab)));
  };
  const draw = () => {
    root.innerHTML = head();
    root.querySelectorAll('[data-cu]').forEach((el) => countUp(el, Number(el.dataset.cu)));
    root.querySelectorAll('[data-tab]').forEach((t) => (t.onclick = () => { tab = t.dataset.tab; ink(); list(); }));
    $('[data-avatar]', root).onclick = openPicker; $('[data-avatar2]', root).onclick = openPicker;
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
