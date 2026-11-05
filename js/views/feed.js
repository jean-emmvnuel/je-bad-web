import * as S from '../store.js';
import { $, confetti, icon, laughingMark, logo, reduceMotion, toast } from '../ui.js';
import { card, wireActions } from '../components.js';

let firstLoad = true;
const TRIGGER = 84, HOLD = 92, MAX = 150;
const LABELS = { pull: 'Tire pour voir les nouveaux badings', release: 'Lâche, ça va bader !', loading: 'On ramène les badings…', done: 'Nouveaux badings !', empty: "C'est à jour, rien de neuf" };

export function feedView(root, { go }) {
  root.innerHTML = `
    <header class="topbar" data-top>
      <div class="logo only-mobile">${logo(28)}<span>Je Bade</span></div>
      <h1 class="t-heading" style="flex:1" data-desk-title>Fil</h1>
      <a class="icon-btn only-mobile" href="#/notifications" aria-label="Notifications">${icon('bell')}<span class="badge" data-badge hidden></span></a>
    </header>
    <div class="ptr" data-ptr aria-live="polite"><div style="position:relative">${laughingMark(44)}<span class="confetti-host" data-ptr-confetti style="position:absolute;left:50%;top:50%"></span></div><span data-ptr-label>${LABELS.pull}</span></div>
    <div data-list></div>`;

  const desk = matchMedia('(min-width: 900px)');
  const syncTitle = () => { $('[data-desk-title]', root).hidden = !desk.matches; };
  syncTitle();
  const badge = () => { const n = S.unread(); const b = $('[data-badge]', root); if (b) { b.hidden = !n; b.textContent = n; } };
  badge();
  const unsub = S.subscribe(badge);

  const list = $('[data-list]', root);
  const draw = (animate = false) => {
    const items = S.feed();
    list.innerHTML = items.length ? items.map(card).join('') : `<div class="empty"><h2 class="t-title">Le fil est calme… trop calme.</h2><p class="muted">Sois le premier à raconter ta galère du jour.</p><a class="btn btn-primary" href="#/compose">Écrire un bading</a></div>`;
    if (animate && !reduceMotion()) gsap.from(list.querySelectorAll('.card-row'), { y: 14, opacity: 0, duration: 0.45, stagger: 0.045, ease: 'expo.out', clearProps: 'all' });
  };
  if (firstLoad) {
    firstLoad = false;
    list.innerHTML = `<div class="skeleton" aria-label="Chargement du fil">${[0, 1, 2].map((i) => `<div class="row" style="opacity:${1 - i * 0.25}"><div class="sk" style="width:44px;height:44px;border-radius:50%"></div><div style="flex:1;display:flex;flex-direction:column;gap:10px"><div class="sk" style="width:40%;height:12px"></div><div class="sk" style="height:12px"></div><div class="sk" style="width:85%;height:12px"></div></div></div>`).join('')}</div>`;
    setTimeout(() => draw(true), 650);
  } else draw(true);
  wireActions(list, go);
  list.addEventListener('changed', () => draw());

  // En-tête façon X sur mobile : disparaît en descendant, revient au moindre retour vers le haut.
  const top = $('[data-top]', root);
  let lastY = scrollY, hidden = false;
  const onScroll = () => {
    if (desk.matches) return;
    const y = scrollY, down = y > lastY && y > 60;
    if (down !== hidden) { hidden = down; gsap.to(top, { yPercent: hidden ? -100 : 0, duration: 0.25, ease: 'power2.out' }); }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });

  // ─── Pull-to-refresh (doigt ou souris, en haut de page) ─────
  const ptr = $('[data-ptr]', root), label = $('[data-ptr-label]', root), mouth = ptr.querySelector('.mouth'), mark = ptr.querySelector('svg');
  let startY = null, pull = 0, busy = false, armed = false, laughTl = null, dragged = false;
  // Un glisser n'est pas un clic : n'ouvre pas la carte sous la souris.
  root.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
  const setLabel = (k) => (label.textContent = LABELS[k]);
  const paint = () => {
    const p = Math.min(1, pull / TRIGGER);
    gsap.set(ptr, { height: pull });
    gsap.set(mark, { scale: 0.5 + p * 0.5 + (pull > TRIGGER && !busy ? (pull - TRIGGER) / 300 : 0), rotation: (1 - p) * -18, opacity: Math.min(1, pull / 40) });
    if (!busy) gsap.set(mouth, { scaleY: 0.12 + 0.88 * p });
  };
  const down = (y) => { if (busy || scrollY > 0) return; startY = y; };
  const move = (y, e) => {
    if (startY === null) return;
    const d = y - startY;
    if (d <= 0) { pull = 0; paint(); return; }
    if (d > 6) dragged = true;
    if (e.cancelable) e.preventDefault();
    pull = MAX * (1 - Math.exp(-d / 190));
    const nowArmed = pull >= TRIGGER;
    if (nowArmed !== armed) { armed = nowArmed; setLabel(armed ? 'release' : 'pull'); if (armed) navigator.vibrate?.(10); }
    paint();
  };
  const up = async () => {
    if (startY === null) return;
    startY = null;
    if (pull < TRIGGER) { gsap.to({ v: pull }, { v: 0, duration: 0.35, ease: 'power3.out', onUpdate() { pull = this.targets()[0].v; paint(); } }); return; }
    busy = true; armed = false; setLabel('loading');
    gsap.to({ v: pull }, { v: HOLD, duration: 0.3, onUpdate() { pull = this.targets()[0].v; paint(); } });
    if (!reduceMotion()) laughTl = gsap.timeline({ repeat: -1 }).to(mouth, { scaleY: 1, duration: 0.14 }).to(mouth, { scaleY: 0.25, duration: 0.14 }).to(mark, { y: -4, duration: 0.28, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
    const n = await S.refreshFeed();
    laughTl?.kill(); gsap.to(mark, { y: 0, duration: 0.15 });
    gsap.to(mouth, { scaleY: n ? 1 : 0.4, duration: 0.3, ease: 'back.out(2)' });
    setLabel(n ? 'done' : 'empty');
    if (n) { confetti($('[data-ptr-confetti]', root)); navigator.vibrate?.([10, 40, 10]); }
    setTimeout(() => {
      gsap.to({ v: pull }, { v: 0, duration: 0.45, ease: 'expo.out', onUpdate() { pull = this.targets()[0].v; paint(); }, onComplete() { busy = false; setLabel('pull'); } });
      draw(true);
      if (n) toast(n > 1 ? `${n} nouveaux badings` : '1 nouveau bading');
    }, 700);
  };
  const ts = (e) => down(e.touches[0].clientY), tm = (e) => move(e.touches[0].clientY, e);
  const md = (e) => { if (e.button === 0 && !e.target.closest('button, a, textarea, input')) down(e.clientY); }, mm = (e) => startY !== null && move(e.clientY, e);
  root.addEventListener('touchstart', ts, { passive: true });
  root.addEventListener('touchmove', tm, { passive: false });
  root.addEventListener('touchend', up);
  root.addEventListener('mousedown', md);
  addEventListener('mousemove', mm);
  addEventListener('mouseup', up);

  return () => { unsub(); removeEventListener('scroll', onScroll); removeEventListener('mousemove', mm); removeEventListener('mouseup', up); laughTl?.kill(); };
}
