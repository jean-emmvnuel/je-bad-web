import * as S from '../store.js';
import { $, $$, avatar, icon, logo, reduceMotion } from '../ui.js';

const SLIDES = [
  { title: "Raconte ce qui t'est arrivé.", body: 'Les galères du quotidien, en mode bading. Court, vrai, et drôle.', bg: '#9810e6', fg: '#FFFFFF', sub: '#F1E4FF', cta: '#1a1919' },
  { title: 'Signe, ou reste anonyme.', body: 'Un interrupteur avant de publier : ton pseudo disparaît, ton histoire reste.', bg: '#EDE3FA', fg: '#1a1919', sub: '#4A1477', cta: '#1a1919' },
  { title: 'Fais rire tout Babi.', body: 'Rires, rebades et partages WhatsApp font tourner ton bading.', bg: '#1a1919', fg: '#F4F1F1', sub: '#A9A4A4', cta: '#9810e6' },
];
const demo = (pseudo, hue) => ({ pseudo, hue });
const mini = (u, name, text, style = '', extra = '') => `<div class="mini" style="${style}"><div class="who">${avatar(u, 32)}<span style="color:${u ? '#F4F1F1' : '#A9A4A4'}">${name}</span></div><div style="font-size:15px;line-height:21px">${text}</div>${extra}</div>`;

const ART = [
  `<div class="art" data-art="0">
    <div class="layer" data-depth="0.15" style="position:absolute;inset:0">${mini(demo('Tantie_Brou', 140), 'Tantie_Brou', 'Le taxi compteur a eu plus de crédit que moi ce mois-ci.', 'top:0;left:0;transform:rotate(-7deg);opacity:.6')}</div>
    <div class="layer" data-depth="0.3" style="position:absolute;inset:0">${mini(demo('Djidji', 52), 'Djidji', "J'ai dit « on se voit à 14h » en Côte d'Ivoire. Il est arrivé à 17h et m'a demandé pourquoi je suis pressé.", 'top:80px;left:46px;transform:rotate(5deg);opacity:.85')}</div>
    <div class="layer" data-depth="0.5" style="position:absolute;inset:0">${mini(demo('Koffi225', 28), 'Koffi225', "Gbaka m'a déposé devant la maison. J'ai dit merci comme si c'était mon chauffeur 😭", 'top:190px;left:20px;transform:rotate(-2deg)')}</div>
  </div>`,
  `<div class="art" data-art="1">
    <div class="mini" style="top:60px;left:20px;width:280px">
      <div class="who" data-who style="height:36px"></div>
      <div style="font-size:15px;line-height:21px">J'ai envoyé « tu me manques » dans le groupe de la famille. Papa a répondu « moi aussi ».</div>
      <div style="height:1px;background:#333131"></div>
      <div style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;gap:8px;align-items:center;color:#A9A4A4">${icon('mask')}<span style="color:#F4F1F1;font-size:14px">Publier en anonyme</span></span><span class="toggle" data-demo-toggle aria-checked="true"><i></i></span></div>
    </div>
  </div>`,
  `<div class="art" data-art="2">
    ${mini(demo('LeVraiZoba', 200), 'LeVraiZoba', 'Courant revient. Tout le quartier crie « ÉHHH » comme si on venait de marquer un but.', 'top:70px;left:10px;background:#222121;border:1px solid #333131',
      `<div style="display:flex;gap:18px;align-items:center;color:#B76BFF"><span style="display:flex;gap:6px;align-items:center" data-pop>${icon('laugh')}<b data-count style="font-variant-numeric:tabular-nums">1 287</b></span><span style="display:flex;gap:6px;align-items:center;color:#A9A4A4">${icon('repeat')}402</span></div>`)}
    <div class="bubble">Ça m'est arrivé hier 💀</div>
  </div>`,
];

export function onboardingView(root, { go }) {
  root.innerHTML = `
  <section id="onb" aria-roledescription="carrousel">
    <div class="top"><div class="logo"><span data-logo>${logo(30, '#fff')}</span><span data-fg>On Bade</span></div><button class="t-label" data-skip data-fg style="min-height:44px">Passer</button></div>
    <div class="track" data-track>
      ${SLIDES.map((s, i) => `<div class="slide" aria-label="Étape ${i + 1} sur 3">${ART[i]}<div class="copy"><h1 class="t-hero" style="color:${s.fg}">${s.title}</h1><p style="color:${s.sub};font-size:18px;line-height:1.45">${s.body}</p></div></div>`).join('')}
    </div>
    <div class="bottom">
      <div class="dots" data-fg role="progressbar" aria-valuemin="1" aria-valuemax="3">${SLIDES.map(() => '<i></i>').join('')}</div>
      <button class="btn btn-block" data-next style="height:58px;color:#fff;font-size:17px">Suivant</button>
      <button class="t-label" data-login data-fg style="min-height:44px">J'ai déjà un compte</button>
    </div>
  </section>`;

  const onb = $('#onb', root), track = $('[data-track]', root);
  const lerpColor = (key, p) => gsap.utils.interpolate(SLIDES.map((s) => s[key]), p / (SLIDES.length - 1));
  const state = { p: 0 };
  let page = 0;

  const paint = () => {
    const p = state.p;
    gsap.set(track, { xPercent: (-100 / 3) * p });
    onb.style.background = lerpColor('bg', p);
    const fg = lerpColor('fg', p);
    $$('[data-fg]', root).forEach((el) => (el.style.color = fg));
    $('[data-next]', root).style.background = lerpColor('cta', p);
    $('[data-logo] svg', root).setAttribute('fill', p < 0.5 ? '#fff' : '#9810e6');
    $$('.dots i', root).forEach((d, i) => { const a = Math.max(0, 1 - Math.abs(p - i)); d.style.width = `${8 + a * 20}px`; d.style.opacity = 0.35 + a * 0.65; });
    // parallaxe des cartes
    $$('[data-art]', root).forEach((art) => {
      const off = p - Number(art.dataset.art);
      $$('.layer', art).forEach((l) => gsap.set(l, { x: -off * 320 * Number(l.dataset.depth) }));
      art.style.opacity = String(Math.max(0, 1 - Math.abs(off) * 1.2));
    });
    $('[data-next]', root).textContent = Math.round(p) === 2 ? 'Créer mon compte' : 'Suivant';
    $('[data-skip]', root).style.visibility = Math.round(p) === 2 ? 'hidden' : 'visible';
    $('.dots', root).setAttribute('aria-valuenow', String(Math.round(p) + 1));
  };
  const goTo = (i) => {
    page = Math.max(0, Math.min(2, i));
    gsap.to(state, { p: page, duration: reduceMotion() ? 0 : 0.6, ease: 'expo.out', onUpdate: paint });
  };
  paint();

  // Glisser (doigt ou souris)
  let start = null;
  track.addEventListener('pointerdown', (e) => { start = { x: e.clientX, p: state.p }; track.setPointerCapture(e.pointerId); gsap.killTweensOf(state); });
  track.addEventListener('pointermove', (e) => { if (!start) return; state.p = Math.max(-0.2, Math.min(2.2, start.p - (e.clientX - start.x) / track.parentElement.clientWidth)); paint(); });
  const end = (e) => { if (!start) return; const dx = e.clientX - start.x; start = null; goTo(Math.abs(dx) > 50 ? page + (dx < 0 ? 1 : -1) : page); };
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
  const onKey = (e) => { if (e.key === 'ArrowRight') goTo(page + 1); if (e.key === 'ArrowLeft') goTo(page - 1); };
  document.addEventListener('keydown', onKey);

  const finish = (mode) => { S.finishOnboarding(); go(`/auth/signup${mode ? '?mode=login' : ''}`, { replace: true }); };
  $('[data-next]', root).onclick = () => (page === 2 ? finish() : goTo(page + 1));
  $('[data-skip]', root).onclick = () => goTo(2);
  $('[data-login]', root).onclick = () => finish(true);

  // Illustrations vivantes
  const tweens = [];
  if (!reduceMotion()) {
    $$('[data-art="0"] .mini', root).forEach((m, i) => tweens.push(gsap.to(m, { y: '+=8', duration: 2.6, delay: i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })));
    tweens.push(gsap.to('[data-art="1"] .mini, [data-art="2"] .mini', { y: '+=7', duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    tweens.push(gsap.to('.bubble', { y: '-=10', rotation: 7, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  let anon = true, count = 1287;
  const who = $('[data-who]', root), tog = $('[data-demo-toggle]', root);
  const drawWho = () => {
    who.innerHTML = `${avatar(anon ? null : demo('AwaLaGo', 330), 36)}<span style="color:${anon ? '#A9A4A4' : '#F4F1F1'}">${anon ? 'Badeur anonyme' : 'AwaLaGo'}</span>`;
    tog.setAttribute('aria-checked', String(anon));
    gsap.fromTo(who, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 });
  };
  drawWho();
  const t1 = reduceMotion() ? null : setInterval(() => { anon = !anon; drawWho(); }, 2200);
  const t2 = reduceMotion() ? null : setInterval(() => {
    count += 1 + Math.floor(Math.random() * 4);
    $('[data-count]', root).textContent = count.toLocaleString('fr-FR');
    gsap.fromTo('[data-pop] svg', { scale: 1.3 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
  }, 900);

  // Entrée
  gsap.from('.slide .copy > *', { y: 24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out', delay: 1.6 });

  return () => { clearInterval(t1); clearInterval(t2); tweens.forEach((t) => t.kill()); document.removeEventListener('keydown', onKey); };
}
