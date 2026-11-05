import { esc, icon, reduceMotion } from '../ui.js';

export function privacyView(root, { back }) {
  root.innerHTML = `<header class="topbar"><button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button><h1 class="t-heading">Confidentialité</h1></header><article style="padding:16px 16px 48px;display:flex;flex-direction:column;gap:24px" data-doc><p class="muted">Chargement…</p></article>`;
  root.querySelector('[data-back]').onclick = () => back('/settings');
  fetch('data/privacy.json').then((r) => r.json()).then((d) => {
    root.querySelector('[data-doc]').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px"><h1 class="t-title">${esc(d.title)}</h1><span class="t-small" style="color:var(--text-3)">${esc(d.version)}</span><p class="muted">${esc(d.intro)}</p></div>
      ${d.sections.map((s) => `<section style="display:flex;flex-direction:column;gap:8px"><h2 class="t-heading">${esc(s.title)}</h2>${s.paragraphs.map((p) => `<p class="muted" style="line-height:1.6">${esc(p)}</p>`).join('')}</section>`).join('')}
      <a class="btn btn-secondary" href="mailto:donnees@jebade.app?subject=Mes%20donn%C3%A9es%20Je%20Bade">Exercer mes droits par e-mail</a>
      <p class="t-small" style="color:var(--text-3)">${esc(d.note)}</p>`;
    if (!reduceMotion()) gsap.from(root.querySelectorAll('[data-doc] > *'), { y: 10, opacity: 0, duration: 0.4, stagger: 0.03, ease: 'expo.out' });
  }).catch(() => (root.querySelector('[data-doc]').innerHTML = '<p class="error">Impossible de charger la politique. Réessaie.</p>'));
}
