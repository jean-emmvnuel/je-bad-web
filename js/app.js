import * as S from './store.js';
import { $, esc, icon, logo, avatar, reduceMotion, closeSheet } from './ui.js';
import { onboardingView } from './views/onboarding.js';
import { signupView, verifyView, pseudoView } from './views/auth.js';
import { feedView } from './views/feed.js';
import { badingView } from './views/bading.js';
import { composeView } from './views/compose.js';
import { profileView } from './views/profile.js';
import { notificationsView } from './views/notifications.js';
import { settingsView } from './views/settings.js';
import { privacyView } from './views/privacy.js';

// ─── Routes (hash) ────────────────────────────────────────
const routes = [
  { path: /^\/onboarding$/, view: onboardingView, bare: true, public: true },
  { path: /^\/auth\/signup$/, view: signupView, bare: true, public: true },
  { path: /^\/auth\/verify$/, view: verifyView, bare: true, public: true },
  { path: /^\/auth\/pseudo$/, view: pseudoView, bare: true, public: true },
  { path: /^\/privacy$/, view: privacyView, public: true },
  { path: /^\/$/, view: feedView, nav: 'feed' },
  { path: /^\/bading\/([\w-]+)$/, view: badingView, keys: ['id'] },
  { path: /^\/compose$/, view: composeView, nav: 'compose' },
  { path: /^\/profile$/, view: profileView, nav: 'profile' },
  { path: /^\/notifications$/, view: notificationsView, nav: 'notifications' },
  { path: /^\/settings$/, view: settingsView, nav: 'settings' },
];

export function go(path, { replace = false } = {}) {
  const h = `#${path}`;
  if (replace) location.replace(h); else location.hash = h;
}
let depth = 0; // navigations internes depuis l'arrivée sur le site
export function back(fallback = '/') {
  if (depth > 0) history.back(); else go(fallback, { replace: true });
}

function parse() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

let cleanup = null;
let shellMounted = false;

function render() {
  const { path, query } = parse();
  const st = S.get();

  // Liens partagés : /b/<id> → le bading (après inscription si besoin, Parcours 1)
  const shared = path.match(/^\/b\/([\w-]+)$/);
  if (shared) {
    if (st.session) return go(`/bading/${shared[1]}`, { replace: true });
    S.setPendingLink(shared[1]);
    return go(st.onboarded ? '/auth/signup' : '/onboarding', { replace: true });
  }

  let route = null, params = {};
  for (const r of routes) {
    const m = path.match(r.path);
    if (m) { route = r; (r.keys || []).forEach((k, i) => (params[k] = m[i + 1])); break; }
  }
  if (!route) return go('/', { replace: true });

  // Gardes d'accès
  if (!st.session && !route.public) return go(st.onboarded ? '/auth/signup' : '/onboarding', { replace: true });
  if (st.session && route.bare) return go(st.pendingLink ? `/bading/${st.pendingLink}` : '/', { replace: true });

  closeSheet(true);
  cleanup?.(); cleanup = null;
  const app = $('#app');

  if (route.bare || (!st.session && route.public)) {
    shellMounted = false;
    app.innerHTML = '<main id="view"></main>';
  } else if (!shellMounted) {
    app.innerHTML = shell();
    shellMounted = true;
    wireShell();
  }
  updateNav(route.nav);
  const view = $('#view');
  view.innerHTML = '';
  window.scrollTo(0, 0);
  cleanup = route.view(view, { params, query, go, back }) || null;
}

// ─── Coquille : rail (desktop), colonne de droite, onglets (mobile) ──
function shell() {
  const u = S.me();
  return `
  <div class="shell">
    <nav class="rail" aria-label="Navigation principale">
      <a class="brand" href="#/">${logo(34)}<span>je bade</span></a>
      <a class="nav" data-nav="feed" href="#/">${icon('house')}<span>Fil</span></a>
      <a class="nav" data-nav="notifications" href="#/notifications">${icon('bell')}<span>Notifications</span><b class="dot" hidden></b></a>
      <a class="nav" data-nav="profile" href="#/profile">${icon('user')}<span>Profil</span></a>
      <a class="nav" data-nav="settings" href="#/settings">${icon('settings')}<span>Paramètres</span></a>
      <a class="btn btn-primary btn-block cta" href="#/compose">${icon('plus')} Bader</a>
      <a class="me" href="#/profile" data-me>${avatar(u, 40)}<span><b>${esc(u?.pseudo ?? '')}</b><br/><span class="t-meta">@${esc(u?.pseudo ?? '')}</span></span></a>
    </nav>
    <main class="main" id="view"></main>
    <aside class="aside" aria-label="Suggestions">
      <div class="card">
        <h2 class="t-heading">Badings du moment</h2>
        <div data-trends></div>
      </div>
      <div class="card">
        <h2 class="t-heading">Je Bade sur ton téléphone</h2>
        <p class="muted">Notifications en direct, Dynamic Island et partage en un geste sur l'app iOS et Android.</p>
      </div>
      <footer>Je Bade · une app ORIVERSE<br/>Créé par <a href="https://monportfolio-blush-phi.vercel.app/" target="_blank" rel="noopener">Jean Emmanuel Ahossi</a> · <a href="#/privacy">Confidentialité</a></footer>
    </aside>
    <nav class="tabbar" aria-label="Onglets">
      <a data-nav="feed" href="#/">${icon('house')}<span>Fil</span></a>
      <div class="bader"><a href="#/compose">${icon('plus')}Bader</a></div>
      <a data-nav="profile" href="#/profile">${icon('user')}<span>Profil</span></a>
    </nav>
  </div>`;
}

function wireShell() {
  const refresh = () => {
    const n = S.unread();
    document.querySelectorAll('.rail .dot').forEach((d) => { d.hidden = !n; d.textContent = n; });
    const trends = $('[data-trends]');
    if (trends) {
      trends.innerHTML = S.feed().filter((b) => !b.rebadeOf).sort((a, b) => b.likes - a.likes).slice(0, 3).map((b) => {
        const { name } = S.displayName(b);
        return `<div class="trend" data-go="/bading/${b.id}" role="link" tabindex="0"><span class="t-meta">${esc(name)} · 😂 ${S.compact(b.likes)}</span><span>${esc(b.text.slice(0, 80))}${b.text.length > 80 ? '…' : ''}</span></div>`;
      }).join('');
    }
    const meEl = $('[data-me]');
    if (meEl && S.me()) meEl.innerHTML = `${avatar(S.me(), 40)}<span><b>${esc(S.me().pseudo)}</b><br/><span class="t-meta">@${esc(S.me().pseudo)}</span></span>`;
  };
  refresh();
  S.subscribe(() => shellMounted && refresh());
  $('#app').addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t && !e.target.closest('button, a')) go(t.dataset.go);
  });
}

function updateNav(active) {
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
}

// ─── Splash : le b rit deux fois puis zoome vers l'app ───────
function splash() {
  const el = $('#splash');
  const done = () => { el.remove(); };
  if (reduceMotion()) { gsap.to(el, { opacity: 0, duration: 0.3, delay: 0.3, onComplete: done }); return; }
  const tl = gsap.timeline({ onComplete: done });
  tl.from('#splash-mark', { scale: 0.6, opacity: 0, duration: 0.45, ease: 'back.out(2)' })
    .to('#splash-mouth', { scaleY: 0.15, duration: 0.11, ease: 'power2.in' })
    .to('#splash-mouth', { scaleY: 1, duration: 0.35, ease: 'elastic.out(1.2, 0.4)' })
    .to('#splash-mark', { scale: 1.06, duration: 0.12 }, '<')
    .to('#splash-mouth', { scaleY: 0.15, duration: 0.1, ease: 'power2.in' })
    .to('#splash-mark', { scale: 0.95, duration: 0.1 }, '<')
    .to('#splash-mouth', { scaleY: 1, duration: 0.35, ease: 'elastic.out(1.2, 0.4)' })
    .to('#splash-mark', { scale: 1, duration: 0.2 }, '<')
    .to('#splash-mark', { scale: 16, duration: 0.55, ease: 'expo.in' }, '+=0.1')
    .to(el, { opacity: 0, duration: 0.25 }, '-=0.15');
}

window.addEventListener('hashchange', () => { depth += 1; render(); });
render();
splash();
