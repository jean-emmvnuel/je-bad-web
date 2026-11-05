import * as S from '../store.js';
import { $, esc, icon } from '../ui.js';

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

// ─── 1. Téléphone ou e-mail ───────────────────────────────
export function signupView(root, { query, go }) {
  const login = query.mode === 'login';
  let method = 'phone';
  const validate = (v) => method === 'phone'
    ? (/^0\d{9}$/.test(v.replace(/\s/g, '')) ? null : 'Un numéro ivoirien a 10 chiffres et commence par 0 (ex. 07 07 12 34 56).')
    : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Cette adresse e-mail n'a pas l'air complète.");
  const field = () => method === 'phone'
    ? `<div class="field"><label for="id">Numéro de téléphone</label><div class="input" data-box><span class="prefix">+225</span><input id="id" type="tel" inputmode="tel" autocomplete="tel" placeholder="07 07 12 34 56" maxlength="14"/></div><p class="error" data-err hidden></p></div>`
    : `<div class="field"><label for="id">Adresse e-mail</label><div class="input" data-box><input id="id" type="email" autocomplete="email" placeholder="toi@exemple.com"/></div><p class="error" data-err hidden></p></div>`;

  root.innerHTML = frame(1, login ? 2 : 3, login ? 'Content de te revoir' : 'On commence par toi',
    "On t'envoie un code pour confirmer que c'est bien toi. Pas de mot de passe à retenir.",
    `<div class="segmented" role="tablist"><button role="tab" data-m="phone" aria-selected="true">Téléphone</button><button role="tab" data-m="email" aria-selected="false">Email</button></div><div data-field>${field()}</div>`,
    `<button class="btn btn-primary btn-block" data-send disabled>Recevoir le code</button>`, false);
  enter(root);

  const send = $('[data-send]', root);
  const wire = () => {
    const input = $('#id', root);
    input.oninput = () => { send.disabled = !input.value; $('[data-err]', root).hidden = true; $('[data-box]', root).classList.remove('err'); };
    input.onkeydown = (e) => e.key === 'Enter' && submit();
    input.focus();
  };
  root.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
    method = b.dataset.m;
    root.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('[data-field]', root).innerHTML = field(); send.disabled = true; wire();
  }));
  const submit = () => {
    const v = $('#id', root).value;
    const err = validate(v);
    if (err) { const e = $('[data-err]', root); e.textContent = err; e.hidden = false; $('[data-box]', root).classList.add('err'); return; }
    send.disabled = true; send.textContent = 'Envoi…';
    setTimeout(() => go(`/auth/verify?id=${encodeURIComponent(method === 'phone' ? `+225 ${v}` : v.trim())}${login ? '&login=1' : ''}`), 800);
  };
  send.onclick = submit;
  wire();
}

// ─── 2. Code OTP ──────────────────────────────────────────
export function verifyView(root, { query, go, back }) {
  const LEN = 6;
  root.innerHTML = frame(2, query.login ? 2 : 3, 'Entre le code', `On l'a envoyé à ${esc(query.id)}.`,
    `<div class="otp" data-otp>${Array.from({ length: LEN }, (_, i) => `<div class="box ${i === 0 ? 'cur' : ''}"></div>`).join('')}<input inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="Code de confirmation à 6 chiffres"/></div>
     <p class="error" data-err hidden></p>
     <button class="t-label" data-resend disabled style="align-self:flex-start;min-height:44px;color:var(--text-3)"></button>
     <p class="hint">Démo : n'importe quel code fonctionne, sauf 000000.</p>`,
    `<button class="btn btn-primary btn-block" data-verify disabled>Vérifier</button>`);
  enter(root);
  $('[data-back]', root).onclick = () => back('/auth/signup');
  const input = $('[data-otp] input', root), boxes = root.querySelectorAll('.otp .box'), btn = $('[data-verify]', root);
  let wait = 30;
  const resend = $('[data-resend]', root);
  const tick = () => { resend.textContent = wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'; resend.disabled = wait > 0; resend.style.color = wait > 0 ? 'var(--text-3)' : 'var(--brand-ink)'; };
  tick();
  const timer = setInterval(() => { if (wait > 0) { wait -= 1; tick(); } }, 1000);
  resend.onclick = () => { wait = 30; tick(); };
  const draw = () => {
    const v = input.value;
    boxes.forEach((b, i) => { b.textContent = v[i] ?? ''; b.classList.toggle('cur', i === v.length); b.classList.remove('err'); });
    btn.disabled = v.length < LEN;
  };
  const submit = () => {
    const c = input.value; if (c.length < LEN) return;
    btn.disabled = true; btn.textContent = 'Vérification…';
    setTimeout(() => {
      btn.textContent = 'Vérifier';
      if (c === '000000') {
        const e = $('[data-err]', root); e.textContent = 'Ce code ne correspond pas. Vérifie le SMS ou demande un nouveau code.'; e.hidden = false;
        boxes.forEach((b) => b.classList.add('err'));
        gsap.fromTo('[data-otp]', { x: 0 }, { keyframes: [{ x: 10 }, { x: -10 }, { x: 7 }, { x: -7 }, { x: 0 }], duration: 0.3 });
        input.value = ''; setTimeout(draw, 600); return;
      }
      if (query.login) { S.signIn(query.id, 'Badeur225'); go(S.get().pendingLink ? `/bading/${S.get().pendingLink}` : '/', { replace: true }); }
      else go(`/auth/pseudo?id=${encodeURIComponent(query.id)}`);
    }, 700);
  };
  input.oninput = () => { input.value = input.value.replace(/\D/g, '').slice(0, LEN); $('[data-err]', root).hidden = true; draw(); if (input.value.length === LEN) submit(); };
  btn.onclick = submit;
  input.focus();
  return () => clearInterval(timer);
}

// ─── 3. Pseudo + charte ───────────────────────────────────
const CHARTE = ['On rit des situations, pas des personnes.', "Pas de moqueries sur l'ethnie, la religion, le handicap, le genre ou l'orientation.", 'Pas de vrais noms ni de photos de personnes sans leur accord.', 'Pas de harcèlement, de menaces, d’insultes ni d’arnaques.'];

export function pseudoView(root, { query, go, back }) {
  root.innerHTML = frame(3, 3, 'Choisis ton nom de Badeur', "C'est ton pseudo public. Tu pourras toujours publier en anonyme.",
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
  enterBtn.onclick = () => {
    S.signIn(query.id, input.value.trim());
    const pending = S.get().pendingLink;
    go(pending ? `/bading/${pending}` : '/', { replace: true });
  };
  input.focus();
}
