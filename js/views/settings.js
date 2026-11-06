import * as S from '../store.js';
import { avatar, closeSheet, esc, icon, logo, sheet, toast } from '../ui.js';
import { enableNotifications, notifStatus, notify } from '../notify.js';

const DAY = 86_400_000;
const row = (act, iconName, label, detail = '', { danger, right } = {}) =>
  `<button class="srow" data-s="${act}">${iconName ? `<span style="color:${danger ? 'var(--danger)' : 'var(--text-2)'}">${icon(iconName)}</span>` : ''}<span class="txt"><span class="t-label" style="${danger ? 'color:var(--danger)' : ''}">${label}</span>${detail ? `<small>${detail}</small>` : ''}</span>${right ?? `<span style="color:var(--text-3)">${icon('chevronRight')}</span>`}</button>`;

export function settingsView(root, { go, back }) {
  const draw = () => {
    const st = S.get(), me = S.me();
    const retryAt = st.badge.status === 'refused' && st.badge.decidedAt ? st.badge.decidedAt + S.RULES.badgeRetryDays * DAY : 0;
    const badgeLabel = { none: 'Pas encore demandé', pending: 'En attente · réponse sous 7 jours', accepted: 'Acceptée', refused: `Refusée${st.badge.reason ? ` : ${st.badge.reason}` : ''}` }[st.badge.status];
    const ns = notifStatus();
    const check = `<span style="color:var(--brand-ink)">${icon('check')}</span>`;
    root.innerHTML = `
      <header class="topbar"><button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button><h1 class="t-heading">Paramètres</h1></header>
      <div style="display:flex;flex-direction:column;gap:24px;padding:24px 0">
        <div class="section"><h3>Compte</h3><div class="group">
          ${row('pseudo', 'userPen', `@${esc(me.pseudo)}`, 'Modifier le pseudo')}
          ${row('badge', 'badgeCheck', 'Demander le badge vérifié', esc(badgeLabel))}
        </div></div>
        <div class="section"><h3>Qui peut me mentionner</h3><div class="group">
          ${row('m-everyone', '', 'Tout le monde', '', { right: st.mentionPolicy === 'everyone' ? check : '' })}
          ${row('m-nobody', '', 'Personne', '', { right: st.mentionPolicy === 'nobody' ? check : '' })}
        </div></div>
        <div class="section"><h3>Utilisateurs bloqués</h3><div class="group">
          ${st.blocked.length ? st.blocked.map((id) => `<div class="srow">${avatar(S.user(id) ?? null, 32)}<span class="txt"><span class="t-label">@${esc(S.user(id)?.pseudo ?? 'inconnu')}</span><small>Ne voit plus tes badings et ne peut plus te mentionner</small></span><button class="btn btn-secondary btn-sm" data-unblock="${id}">Débloquer</button></div>`).join('') : row('', 'userX', "Personne pour l'instant", 'Bloque quelqu’un depuis le menu « … » d’un de ses badings', { right: '' })}
        </div></div>
        <div class="section"><h3>Notifications</h3><div class="group">
          ${row('notif', 'bell', 'Notifications du navigateur', { granted: st.notifEnabled ? 'Activées : rires, commentaires, réponses, mentions' : 'Autorisées — touche pour les réactiver', denied: 'Bloquées : à réautoriser dans les réglages du navigateur', undetermined: 'Touche pour les activer', unavailable: 'Non prises en charge par ce navigateur' }[ns])}
        </div></div>
        <div class="section"><h3>Mes données</h3><div class="group">
          ${row('privacy', 'lock', 'Politique de confidentialité', 'Tes données, tes droits (loi ivoirienne n° 2013-450)')}
          ${row('export', 'download', 'Recevoir une copie de mes données', 'Envoyée à ton adresse e-mail sous 30 jours')}
          ${st.deletion.status === 'pending'
            ? `<div class="srow"><span style="color:var(--danger)">${icon('trash')}</span><span class="txt"><span class="t-label">Suppression demandée</span><small>Le ${S.fmtDate(st.deletion.requestedAt + S.RULES.deletionDays * DAY)} · tu peux encore annuler</small></span><button class="btn btn-secondary btn-sm" data-s="cancel-del">Annuler</button></div>`
            : row('delete', 'trash', 'Demander la suppression de mon compte', '', { danger: true })}
        </div></div>
        <div class="section"><h3>Session</h3><div class="group">${row('logout', 'logOut', 'Se déconnecter')}</div></div>
        <a class="credit" href="https://jeanemmanuel-portfolio-gamma.vercel.app/" target="_blank" rel="noopener" aria-label="Créé par Jean Emmanuel Ahossi, ouvrir son portfolio">
          ${logo(28)}<span class="t-small" style="color:var(--text-3)">On Bade · ORIVERSE</span>
          <span>Créé par <b style="color:var(--text)">Jean Emmanuel Ahossi</b></span>
          <span class="t-small" style="color:var(--brand-ink);text-decoration:underline">jeanemmanuel-portfolio-gamma.vercel.app</span>
        </a>
      </div>`;
    root.querySelector('[data-back]').onclick = () => back('/profile');
    root.querySelectorAll('[data-unblock]').forEach((b) => (b.onclick = () => { S.unblock(b.dataset.unblock); toast('Débloqué'); draw(); }));
    root.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => handle(b.dataset.s, retryAt)));
  };

  const handle = async (a, retryAt) => {
    const st = S.get(), me = S.me();
    if (a === 'm-everyone' || a === 'm-nobody') { S.setMentionPolicy(a.slice(2)); return draw(); }
    if (a === 'privacy') return go('/privacy');
    if (a === 'logout') { S.signOut(); return go('/auth/signup?mode=login', { replace: true }); }
    if (a === 'export') return toast('Demande envoyée : tu recevras un lien sécurisé');
    if (a === 'cancel-del') { S.cancelDeletion(); toast('Demande de suppression annulée'); return draw(); }
    if (a === 'notif') {
      const r = await enableNotifications(); draw();
      if (r === 'granted') { toast('Notifications activées 🎉'); setTimeout(() => notify('Notifications activées 🎉', 'Tu seras prévenu quand on rit à tes badings.', '/notifications'), 300); }
      else if (r === 'denied') toast('Notifications bloquées par le navigateur');
      return;
    }
    if (a === 'pseudo') {
      const p = sheet({ title: 'Modifier le pseudo', html: `<div class="pad"><div class="field"><label for="np">Nouveau pseudo</label><div class="input" data-box><span class="prefix">@</span><input id="np" maxlength="20" autocapitalize="off" value="${esc(me.pseudo)}"/></div><p class="hint" data-h></p></div>${me.verified ? '<p class="error">Ton badge vérifié sera retiré : il faudra le redemander.</p>' : ''}<button class="btn btn-primary btn-block" data-ok disabled>Enregistrer</button></div>` });
      const input = p.querySelector('#np'), ok = p.querySelector('[data-ok]'), h = p.querySelector('[data-h]');
      input.oninput = () => {
        const v = input.value.trim();
        const err = !/^[A-Za-z0-9_.]{3,20}$/.test(v) ? 'Entre 3 et 20 caractères : lettres, chiffres, _ ou .' : Object.values(S.get().users).some((u) => u.id !== S.ME && u.pseudo.toLowerCase() === v.toLowerCase()) ? 'Ce pseudo est déjà pris.' : '';
        h.className = err ? 'error' : 'hint'; h.textContent = err; p.querySelector('[data-box]').classList.toggle('err', !!err);
        ok.disabled = !!err || v === me.pseudo;
      };
      ok.onclick = () => { S.changePseudo(input.value.trim()); closeSheet(); toast('Pseudo modifié'); draw(); };
      return;
    }
    if (a === 'badge') {
      const ageDays = Math.floor((Date.now() - (me.joinedAt ?? Date.now())) / DAY);
      const published = S.feed().filter((b) => b.authorId === S.ME && !b.rebadeOf).length;
      const checks = [[ageDays >= S.RULES.badge.minAgeDays, `Compte de plus de ${S.RULES.badge.minAgeDays} jours`, `${ageDays} j`], [published >= S.RULES.badge.minBadings, `Au moins ${S.RULES.badge.minBadings} badings publiés`, `${published} / ${S.RULES.badge.minBadings}`], [true, 'Aucun avertissement de modération', 'OK']];
      const waiting = retryAt > Date.now(), eligible = checks.every((c) => c[0]) && !waiting;
      const body = st.badge.status === 'pending' ? `<p class="muted">Ta demande est en cours d'examen. Réponse sous 7 jours, par notification.</p><b style="color:var(--brand-ink)">Statut : en attente</b>` : `
        <p class="muted">Il confirme que ton compte est authentique (humoristes, pages, marques). Gratuit.</p>
        ${st.badge.status === 'refused' ? `<p class="t-meta" style="color:var(--text-2)">Dernière demande refusée${st.badge.reason ? ` : ${esc(st.badge.reason)}` : ''}.${waiting ? ` Nouvelle demande possible le ${S.fmtDate(retryAt)}.` : ''}</p>` : ''}
        <div style="display:flex;flex-direction:column;gap:12px">${checks.map(([ok, l, v]) => `<div style="display:flex;align-items:center;gap:12px"><span style="color:${ok ? 'var(--success)' : 'var(--danger)'}">${icon(ok ? 'check' : 'circleX')}</span><span style="flex:1">${l}</span><span class="t-meta">${v}</span></div>`).join('')}</div>
        <div data-form hidden style="display:flex;flex-direction:column;gap:12px">
          <div class="field"><label for="links">Liens vers tes réseaux sociaux</label><div class="input"><input id="links" placeholder="tiktok.com/@toi, facebook.com/tapage"/></div><p class="hint">Au moins un lien, séparés par des virgules</p></div>
          <label class="srow" style="border:1px dashed var(--line);border-radius:var(--r-md);cursor:pointer">${icon('idCard')}<span class="txt"><span class="t-label" data-file-l>Ajouter ta pièce d'identité</span><small>Ou un document de l'entreprise pour une page</small></span><input type="file" accept="image/*,application/pdf" hidden data-file/></label>
          <p class="t-small" style="color:var(--text-3)">La pièce est supprimée dès que la demande est traitée.</p>
        </div>
        <button class="btn btn-primary btn-block" data-go-badge ${eligible ? '' : 'disabled'}>${eligible ? 'Continuer' : 'Pas encore éligible'}</button>`;
      const p = sheet({ title: 'Badge vérifié', html: `<div class="pad">${body}</div>` });
      const next = p.querySelector('[data-go-badge]'); if (!next) return;
      let step = 'check', file = null;
      const links = () => (p.querySelector('#links')?.value ?? '').split(/[\s,]+/).filter((l) => /^(https?:\/\/)?[\w-]+\.[\w.-]+/.test(l));
      const refreshBtn = () => { if (step === 'form') next.disabled = !(links().length && file); };
      next.onclick = () => {
        if (step === 'check') { step = 'form'; p.querySelector('[data-form]').hidden = false; next.textContent = 'Envoyer la demande'; next.disabled = true; p.querySelector('#links').oninput = refreshBtn; p.querySelector('[data-file]').onchange = (e) => { file = e.target.files[0]; p.querySelector('[data-file-l]').textContent = file ? `Pièce ajoutée : ${file.name}` : "Ajouter ta pièce d'identité"; refreshBtn(); }; return; }
        S.requestBadge(links()); closeSheet(); toast('Demande envoyée · réponse sous 7 jours'); draw();
      };
      return;
    }
    if (a === 'delete') {
      let reason = null;
      const p = sheet({ title: 'Supprimer ton compte ?', html: `<div class="pad">
        <p class="muted">Ta demande est enregistrée tout de suite. Ton compte, tes badings (signés et anonymes), tes commentaires, favoris et données personnelles seront effacés le ${S.fmtDate(Date.now() + S.RULES.deletionDays * DAY)}. D'ici là, tu peux annuler depuis cet écran.</p>
        <div style="display:flex;flex-direction:column;gap:8px"><span class="t-label" style="color:var(--text-3)">Pourquoi tu pars ? (facultatif)</span><div style="display:flex;flex-wrap:wrap;gap:8px" data-reasons>${['Je n’utilise plus l’app', 'Trop de notifications', 'Je m’inquiète pour mes données', 'Autre'].map((r) => `<button class="chip" role="radio" aria-checked="false">${r}</button>`).join('')}</div></div>
        <button class="check" role="checkbox" aria-checked="false" data-ack><span class="box" style="border-color:var(--text-3)">${icon('check')}</span><span class="t-label">Je comprends que la suppression est définitive après ${S.RULES.deletionDays} jours</span></button>
        <button class="btn btn-danger btn-block" data-send disabled>Envoyer la demande</button></div>` });
      p.querySelector('[data-reasons]').onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; const on = c.getAttribute('aria-checked') !== 'true'; p.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-checked', 'false')); c.setAttribute('aria-checked', String(on)); reason = on ? c.textContent : null; };
      const ack = p.querySelector('[data-ack]'), send = p.querySelector('[data-send]');
      ack.onclick = () => { const on = ack.getAttribute('aria-checked') !== 'true'; ack.setAttribute('aria-checked', String(on)); ack.querySelector('.box').style.background = on ? 'var(--danger)' : ''; ack.querySelector('.box').style.borderColor = on ? 'var(--danger)' : 'var(--text-3)'; send.disabled = !on; };
      send.onclick = () => { S.requestDeletion(reason ?? undefined); closeSheet(); toast('Demande de suppression envoyée'); draw(); };
    }
  };
  draw();
}
