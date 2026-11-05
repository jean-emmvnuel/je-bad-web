import * as S from '../store.js';
import { $, avatar, esc, icon, toast, verified } from '../ui.js';
import { simulateEngagement } from '../notify.js';

const ERRORS = {
  too_short: `Encore un peu : un bading fait au moins ${S.RULES.minLength} caractères.`,
  too_long: `Trop long : ${S.RULES.maxLength} caractères maximum.`,
  daily_limit: `Tu as atteint ${S.RULES.dailyLimit} badings aujourd'hui. Reviens demain !`,
  blocked_word: 'Un mot de ton bading n’est pas accepté par la charte. Reformule-le.',
  too_many_mentions: `${S.RULES.maxMentions} mentions maximum par bading.`,
};

export function composeView(root, { go, back }) {
  const me = S.me();
  const draft = S.get().draft;
  let anonymous = draft.anonymous, published = false;
  root.innerHTML = `
    <header class="topbar"><button class="icon-btn" data-close aria-label="Fermer, le brouillon est gardé">${icon('x')}</button><h1 class="t-heading">Nouveau bading</h1><button class="btn btn-primary btn-sm" data-publish disabled>Publier</button></header>
    <div class="compose-box">
    <div style="padding:16px;display:flex;gap:12px">
      <span data-av>${avatar(anonymous ? null : me, 44)}</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <b data-who></b>
        <textarea class="plain" rows="6" maxlength="1200" placeholder="Qu'est-ce qui t'est arrivé ?" aria-label="Ton bading">${esc(draft.text)}</textarea>
        <div data-suggest></div>
        <p class="error" data-err hidden></p>
      </div>
    </div>
    <div style="border-top:1px solid var(--line);padding:12px 16px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="icon-btn" style="width:36px;height:36px" data-mask>${icon('mask')}</span>
        <span style="flex:1"><b class="t-label">Publier en anonyme</b><br/><span class="t-small" style="color:var(--text-3)">Ne pourra plus être changé après publication</span></span>
        <button class="toggle" role="switch" aria-checked="${anonymous}" aria-label="Publier en anonyme" data-anon><i></i></button>
      </div>
      <div style="display:flex;justify-content:space-between" class="t-small"><span data-left style="color:var(--text-3)"></span><span data-count style="font-variant-numeric:tabular-nums;color:var(--text-3)"></span></div>
    </div>
    </div>`;

  const ta = $('textarea', root), pub = $('[data-publish]', root), err = $('[data-err]', root);
  const who = () => {
    $('[data-who]', root).innerHTML = anonymous ? '<span style="color:var(--text-2)">Badeur anonyme</span>' : `${esc(me.pseudo)} ${me.verified ? verified() : ''}`;
    $('[data-av]', root).innerHTML = avatar(anonymous ? null : me, 44);
    const m = $('[data-mask]', root); m.style.background = anonymous ? 'var(--brand-soft)' : 'var(--surface)'; m.style.color = anonymous ? 'var(--brand-ink)' : 'var(--text-2)';
    gsap.fromTo('[data-who], [data-av]', { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25 });
  };
  const refresh = () => {
    const len = ta.value.trim().length, tooLong = len > S.RULES.maxLength;
    pub.disabled = len < S.RULES.minLength || tooLong;
    const c = $('[data-count]', root); c.textContent = `${len} / ${S.RULES.maxLength}`; c.style.color = tooLong ? 'var(--danger)' : len > S.RULES.maxLength * 0.9 ? 'var(--brand-ink)' : 'var(--text-3)';
    const left = S.RULES.dailyLimit - S.get().postedToday;
    $('[data-left]', root).textContent = left <= 5 ? `Encore ${Math.max(0, left)} bading${left > 1 ? 's' : ''} aujourd'hui` : 'Tape @ pour mentionner quelqu’un';
    // Suggestions @mention pour le mot sous le curseur
    const before = ta.value.slice(0, ta.selectionEnd), m = before.match(/@([\w.]*)$/);
    const box = $('[data-suggest]', root);
    const list = m && S.countMentions(ta.value) <= S.RULES.maxMentions ? S.searchPseudos(m[1]) : [];
    box.innerHTML = list.length ? `<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden">${list.map((u) => `<button class="srow" data-pick="${esc(u.pseudo)}" style="min-height:52px">${avatar(u, 32)}<b>${esc(u.pseudo)}</b>${u.verified ? verified() : ''}</button>`).join('')}</div>` : '';
  };
  ta.oninput = () => { err.hidden = true; refresh(); };
  ta.onkeyup = ta.onclick = refresh;
  $('[data-suggest]', root).onclick = (e) => {
    const p = e.target.closest('[data-pick]')?.dataset.pick; if (!p) return;
    const end = ta.selectionEnd, before = ta.value.slice(0, end).replace(/@([\w.]*)$/, `@${p} `);
    ta.value = before + ta.value.slice(end); ta.focus(); ta.setSelectionRange(before.length, before.length); refresh();
  };
  $('[data-anon]', root).onclick = (e) => { anonymous = !anonymous; e.currentTarget.setAttribute('aria-checked', String(anonymous)); who(); };
  $('[data-close]', root).onclick = () => back('/');
  pub.onclick = () => {
    const r = S.publish(ta.value, anonymous);
    if (!r.ok) { err.textContent = ERRORS[r.error]; err.hidden = false; gsap.fromTo(err, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); return; }
    published = true;
    toast(anonymous ? 'Publié en Badeur anonyme' : 'Ton bading est en ligne');
    setTimeout(() => simulateEngagement(r.id), 1500);
    go('/', { replace: true });
  };
  who(); refresh(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  // RG7 : brouillon conservé si on quitte sans publier
  return () => { if (!published) S.setDraft({ text: ta.value, anonymous }); };
}
