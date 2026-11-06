import * as S from '../store.js';
import { $, avatar, closeSheet, countUp, esc, icon, reduceMotion, sheet, sheetItem, toast, verified } from '../ui.js';
import { ACCEPT, openCropper, readImageFile } from '../cropper.js';
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
    <header class="topbar"><h1 class="t-heading" style="flex:1">Profil</h1><a class="icon-btn only-mobile" href="#/settings" aria-label="Paramètres">${icon('settings')}</a></header>
    <section class="profile-hero pf-card">
      <button class="pf-avatar" data-avatar aria-label="Changer ma photo de profil">
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
      <button class="btn btn-secondary btn-sm pf-btn" data-avatar2>${icon('image')} ${u.photo ? 'Changer ma photo' : 'Ajouter une photo'}</button>
      <input type="file" accept="${ACCEPT}" data-photo-file hidden/>
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
    $('[data-avatar]', root).onclick = photoMenu; $('[data-avatar2]', root).onclick = photoMenu;
    $('[data-photo-file]', root).onchange = onFile;
    list(); requestAnimationFrame(ink);
  };
  wireActions(root, go);
  root.addEventListener('changed', draw);
  draw();

  // Photo de profil : on choisit une image, on la recadre en carré, elle s'affiche en rond partout.
  function photoMenu() {
    if (!me().photo) { $('[data-photo-file]', root).click(); return; }
    const p = sheet({ title: 'Photo de profil', html: `<div class="pad" style="gap:0">
      ${sheetItem('pick', 'Choisir une autre photo', { iconName: 'image' })}
      ${sheetItem('remove', 'Retirer la photo', { iconName: 'trash', danger: true })}</div>` });
    p.querySelector('[data-act=pick]').onclick = () => { closeSheet(); $('[data-photo-file]', root).click(); };
    p.querySelector('[data-act=remove]').onclick = () => { S.setPhoto(null); closeSheet(); toast('Photo retirée'); draw(); };
  }
  async function onFile(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    try {
      const src = await readImageFile(file);
      const r = await openCropper(src, {}, { ratios: ['1:1'], outMax: 400, title: 'Photo de profil', round: true });
      if (!r) return;
      S.setPhoto(r.dataUrl); toast('Photo de profil enregistrée'); draw();
    } catch (x) { if (x.message !== 'none') toast(x.message); }
  }
}
