import * as S from '../store.js';
import { avatar, esc, icon, reduceMotion } from '../ui.js';

export function notificationsView(root, { go, back }) {
  const describe = (n) => {
    const actor = n.actorId ? S.user(n.actorId)?.pseudo : null;
    switch (n.kind) {
      case 'like': return ['laugh', `${actor}${n.others ? ` et ${n.others} autres ont` : ' a'} ri à ton bading`];
      case 'rebade': return ['repeat', `${actor ?? 'Un Badeur anonyme'} a rebadé ton bading`];
      case 'mention': return ['atSign', `${actor ?? 'Un Badeur anonyme'} t'a mentionné`];
      case 'comment': return ['message', `${actor} a commenté ton bading`];
      case 'reply': return ['message', `${actor} a répondu à ton commentaire`];
      default: return ['badgeCheck', n.badgeStatus === 'accepted' ? 'Ta demande de badge vérifié est acceptée' : 'Ta demande de badge vérifié est refusée : il faut au moins 10 badings publiés.'];
    }
  };
  const draw = () => {
    const list = S.get().notifications;
    root.innerHTML = `<header class="topbar"><button class="icon-btn" data-back aria-label="Retour">${icon('arrowLeft')}</button><h1 class="t-heading">Notifications</h1></header>
    ${list.length ? list.map((n) => {
      const [ic, text] = describe(n); const b = n.badingId ? S.bading(n.badingId) : null;
      return `<button class="card-row" data-go="${n.badingId ? `/bading/${n.badingId}${n.kind === 'reply' || n.kind === 'comment' ? '?focus=comment' : ''}` : '/settings'}" style="width:100%;text-align:left;padding:16px;${n.read ? '' : 'background:rgba(152,16,230,.07)'}">
        <span style="width:44px;display:flex;justify-content:flex-end;color:${n.kind === 'badge' && n.badgeStatus !== 'accepted' ? 'var(--text-2)' : 'var(--brand-ink)'}">${icon(ic)}</span>
        <span class="body" style="gap:6px">${n.kind !== 'badge' ? avatar(n.actorId ? S.user(n.actorId) ?? null : null, 32) : ''}<span>${esc(text)} <span class="t-meta">· ${S.timeAgo(n.createdAt)}</span></span>${b ? `<span class="t-meta" style="color:var(--text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(b.text)}</span>` : ''}</span>
        ${n.read ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:var(--brand);margin-top:8px;flex:none" aria-label="Non lue"></span>'}
      </button>`;
    }).join('') : '<p class="muted" style="padding:24px">Rien de neuf. Quand quelqu\'un rit à tes badings, tu le verras ici.</p>'}`;
    root.querySelector('[data-back]').onclick = () => back('/');
    root.querySelectorAll('[data-go]').forEach((el) => (el.onclick = () => go(el.dataset.go)));
  };
  draw();
  if (!reduceMotion()) gsap.from(root.querySelectorAll('.card-row'), { y: 12, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'expo.out', clearProps: 'all' });
  const t = setTimeout(() => S.markAllRead(), 1200);
  return () => clearTimeout(t);
}
