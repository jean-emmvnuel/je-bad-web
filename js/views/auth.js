import * as S from '../store.js';
import { $, esc, icon, toast } from '../ui.js';

const frame = (step, total, title, subtitle, body, foot, backBtn = true) => `
  <div class="full">
    <div class="auth-head">
      ${backBtn ? `<button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button>` : '<span style="width:44px"></span>'}
      <div class="progress" role="progressbar" aria-label="Étape ${step} sur ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <span style="width:44px"></span>
    </div>
    <div class="auth-body">
      <div data-in style="display:flex;flex-direction:column;gap:8px"><h1 class="t-title">${title}</h1>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>
      <div data-in style="display:flex;flex-direction:column;gap:16px">${body}</div>
    </div>
    <div class="auth-foot">${foot}</div>
  </div>`;

const enter = (root) => gsap.from($('.auth-body', root).children, { y: 18, opacity: 0, duration: 0.5, stagger: 0.07, ease: 'expo.out' });

// ─── 1. E-mail + mot de passe (inscription ou connexion) ──
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwField = (id, label, autocomplete, hint = '') => `
  <div class="field"><label for="${id}">${label}</label>
    <div class="input" data-box="${id}"><input id="${id}" type="password" autocomplete="${autocomplete}" placeholder="••••••••" maxlength="72"/>
      <button type="button" class="t-small reveal" data-reveal="${id}" aria-label="Afficher le mot de passe" aria-pressed="false">Afficher</button></div>
    ${hint ? `<p class="hint" data-hint="${id}">${hint}</p>` : ''}<p class="error" data-err="${id}" hidden></p></div>`;

export function signupView(root, { query, go }) {
  const login = query.mode === 'login';
  root.innerHTML = frame(1, login ? 1 : 2, login ? 'Content de te revoir' : 'Crée ton compte',
    login ? 'Connecte-toi avec ton adresse e-mail et ton mot de passe.' : 'Ton e-mail reste privé : personne ne le voit, même quand tu publies en anonyme.',
    `<form class="auth-form" data-form novalidate style="display:flex;flex-direction:column;gap:16px">
      <div class="field"><label for="email">Adresse e-mail</label><div class="input" data-box="email"><input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="toi@exemple.com"/></div><p class="error" data-err="email" hidden></p></div>
      ${pwField('pw', 'Mot de passe', login ? 'current-password' : 'new-password', login ? '' : 'Au moins 8 caractères, avec des lettres et des chiffres.')}
      ${login ? '<button type="button" class="t-label link" data-forgot>Mot de passe oublié ?</button>' : pwField('pw2', 'Confirme le mot de passe', 'new-password')}
      <p class="error" data-err="form" hidden></p>
      <button type="submit" hidden></button>
    </form>`,
    `<button class="btn btn-primary btn-block" data-send disabled>${login ? 'Se connecter' : 'Continuer'}</button>
     <p class="switch muted">${login ? "Pas encore de compte ? <a href=\"#/auth/signup\">S'inscrire</a>" : 'Déjà un compte ? <a href="#/auth/signup?mode=login">Se connecter</a>'}</p>`, false);
  enter(root);

  const form = $('[data-form]', root), send = $('[data-send]', root);
  const val = (id) => $(`#${id}`, root)?.value ?? '';
  const setErr = (id, msg) => {
    const e = $(`[data-err="${id}"]`, root); if (!e) return;
    e.textContent = msg || ''; e.hidden = !msg;
    $(`[data-box="${id}"]`, root)?.classList.toggle('err', !!msg);
    const h = $(`[data-hint="${id}"]`, root); if (h) h.hidden = !!msg;
  };
  const clearAll = () => ['email', 'pw', 'pw2', 'form'].forEach((k) => setErr(k));
  const ready = () => (send.disabled = !(val('email') && val('pw') && (login || val('pw2'))));
  form.addEventListener('input', () => { clearAll(); ready(); });

  root.querySelectorAll('[data-reveal]').forEach((b) => (b.onclick = () => {
    const input = $(`#${b.dataset.reveal}`, root), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Masquer' : 'Afficher'; b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  }));

  $('[data-forgot]', root)?.addEventListener('click', () => {
    const email = val('email').trim();
    if (!EMAIL.test(email)) return setErr('email', "Entre d'abord ton adresse e-mail, on t'enverra un lien.");
    toast(`Si un compte existe pour ${email}, un lien pour changer le mot de passe vient d'être envoyé.`);
  });

  const submit = async () => {
    clearAll();
    const email = val('email').trim().toLowerCase(), pw = val('pw');
    let bad = false;
    if (!EMAIL.test(email)) { setErr('email', "Cette adresse e-mail n'a pas l'air complète."); bad = true; }
    if (!login) {
      const pwErr = S.passwordProblem(pw);
      if (pwErr) { setErr('pw', pwErr); bad = true; }
      else if (pw !== val('pw2')) { setErr('pw2', 'Les deux mots de passe ne sont pas identiques.'); bad = true; }
    }
    if (bad) return;
    send.disabled = true; send.textContent = login ? 'Connexion…' : 'Vérification…';
    const res = login ? await S.logIn(email, pw) : await S.checkEmailFree(email);
    send.textContent = login ? 'Se connecter' : 'Continuer'; send.disabled = false;
    if (res === 'unknown') return setErr('form', "Aucun compte n'utilise cet e-mail. Inscris-toi d'abord.");
    if (res === 'wrong_password') { setErr('pw', 'Mot de passe incorrect.'); return; }
    if (res === 'taken') return setErr('email', 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.');
    if (login) { const p = S.get().pendingLink; go(p ? `/bading/${p}` : '/', { replace: true }); return; }
    S.setPendingSignup({ email, pw });
    go('/auth/pseudo');
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); if (!send.disabled) submit(); });
  send.onclick = submit;
  ready();
  $('#email', root).focus();
}

// ─── 3. Pseudo + charte ───────────────────────────────────
const CHARTE = ['On rit des situations, pas des personnes.', "Pas de moqueries sur l'ethnie, la religion, le handicap, le genre ou l'orientation.", 'Pas de vrais noms ni de photos de personnes sans leur accord.', 'Pas de harcèlement, de menaces, d’insultes ni d’arnaques.'];

export function pseudoView(root, { go, back }) {
  if (!S.get().pendingSignup) { go('/auth/signup', { replace: true }); return; }
  root.innerHTML = frame(2, 2, 'Choisis ton nom de Badeur', "C'est ton pseudo public. Tu pourras toujours publier en anonyme.",
    `<div class="field"><label for="pseudo">Pseudo</label><div class="input" data-box><span class="prefix">@</span><input id="pseudo" autocapitalize="off" autocomplete="off" maxlength="20" placeholder="TonPseudo"/><span data-state></span></div><p class="hint" data-hint>Visible sur ton profil et tes badings signés.</p></div>
     <div class="charte">
       <h2 class="t-title" style="font-size:24px">Ici, la seule règle, c'est qu'il n'y a pas de règle.</h2>
       <p class="muted">Enfin… presque 😅 Pour que tout le monde rigole tranquille, la charte du Badeur tient en quatre lignes :</p>
       <ul style="display:flex;flex-direction:column;gap:8px">${CHARTE.map((c) => `<li>${c}</li>`).join('')}</ul>
       <button class="check" role="checkbox" aria-checked="false" data-accept><span class="box">${icon('check')}</span><span class="t-label">J'ai 18 ans ou plus, j'accepte la charte et la <a href="#/privacy" data-privacy>politique de confidentialité</a></span></button>
     </div>`,
    `<button class="btn btn-primary btn-block" data-enter disabled>Entrer dans Je Bade</button>`);
  enter(root);
  $('[data-back]', root).onclick = () => back('/auth/signup');
  const input = $('#pseudo', root), hint = $('[data-hint]', root), box = $('[data-box]', root), stateEl = $('[data-state]', root), accept = $('[data-accept]', root), enterBtn = $('[data-enter]', root);
  let status = 'idle', timer;
  const refresh = () => (enterBtn.disabled = !(status === 'free' && accept.getAttribute('aria-checked') === 'true'));
  input.oninput = () => {
    const p = input.value.trim(); clearTimeout(timer); box.classList.remove('err');
    if (!p) { status = 'idle'; hint.className = 'hint'; hint.textContent = 'Visible sur ton profil et tes badings signés.'; stateEl.innerHTML = ''; return refresh(); }
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(p)) { status = 'invalid'; box.classList.add('err'); hint.className = 'error'; hint.textContent = 'Entre 3 et 20 caractères : lettres, chiffres, _ ou .'; stateEl.innerHTML = ''; return refresh(); }
    status = 'checking'; stateEl.innerHTML = '<span class="t-meta">…</span>'; refresh();
    timer = setTimeout(() => {
      const taken = Object.values(S.get().users).some((u) => u.pseudo.toLowerCase() === p.toLowerCase());
      status = taken ? 'taken' : 'free';
      if (taken) { box.classList.add('err'); hint.className = 'error'; hint.textContent = 'Ce pseudo est déjà pris. Essaie une variante.'; stateEl.innerHTML = ''; }
      else { hint.className = 'hint'; hint.style.color = 'var(--success)'; hint.textContent = 'Disponible'; stateEl.innerHTML = `<span style="color:var(--success)">${icon('circleCheck')}</span>`; }
      refresh();
    }, 400);
  };
  accept.onclick = (e) => { if (e.target.closest('[data-privacy]')) return; accept.setAttribute('aria-checked', String(accept.getAttribute('aria-checked') !== 'true')); refresh(); };
  enterBtn.onclick = async () => {
    enterBtn.disabled = true;
    await S.register(input.value.trim());
    const pending = S.get().pendingLink;
    go(pending ? `/bading/${pending}` : '/', { replace: true });
  };
  input.focus();
}
