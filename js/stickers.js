// Bibliothèque de stickers On Bade (F8, RG2) : expressions ivoiriennes et réactions.
// Même liste dans l'app mobile (src/data/stickers.ts) et le back-office.
export const STICKERS = [
  { id: 'mort', theme: 'reactions', emoji: '😂', label: 'Je suis mort', bg: '#9810e6', fg: '#ffffff', rot: -4 },
  { id: 'pardon', theme: 'reactions', emoji: '😭', label: 'Pardon !', bg: '#ff6fa8', fg: '#1a1919', rot: 3 },
  { id: 'chaud', theme: 'reactions', emoji: '🔥', label: "C'est chaud", bg: '#ffb547', fg: '#1a1919', rot: -2 },
  { id: 'crane', theme: 'reactions', emoji: '💀', label: 'Tchrrr', bg: '#f4f1f1', fg: '#1a1919', rot: 4 },
  { id: 'applaudir', theme: 'reactions', emoji: '👏', label: 'Validé', bg: '#3ddc97', fg: '#1a1919', rot: -3 },
  { id: 'choc', theme: 'reactions', emoji: '😳', label: 'Quoi ?!', bg: '#5ab0ff', fg: '#1a1919', rot: 2 },
  { id: 'ehhh', theme: 'nouchi', emoji: '🙌', label: 'Éhhh !', bg: '#ffb547', fg: '#1a1919', rot: -5 },
  { id: 'deh', theme: 'nouchi', emoji: '😮', label: 'Dêh !', bg: '#9810e6', fg: '#ffffff', rot: 3 },
  { id: 'gate', theme: 'nouchi', emoji: '🤯', label: "C'est gâté", bg: '#ff5a5f', fg: '#ffffff', rot: -2 },
  { id: 'fohi', theme: 'nouchi', emoji: '😎', label: 'Y a fohi', bg: '#3ddc97', fg: '#1a1919', rot: 4 },
  { id: 'aller', theme: 'nouchi', emoji: '🙏', label: 'Ça va aller', bg: '#f4f1f1', fg: '#1a1919', rot: -3 },
  { id: 'ensemble', theme: 'nouchi', emoji: '🤝', label: 'On est ensemble', bg: '#5ab0ff', fg: '#1a1919', rot: 2 },
  { id: 'enjaille', theme: 'nouchi', emoji: '💃', label: 'Je suis enjaillé', bg: '#ff6fa8', fg: '#1a1919', rot: -4 },
  { id: 'kpakpato', theme: 'nouchi', emoji: '👀', label: 'Kpakpato', bg: '#ffb547', fg: '#1a1919', rot: 3 },
  { id: 'dose', theme: 'nouchi', emoji: '💯', label: "C'est dosé", bg: '#9810e6', fg: '#ffffff', rot: -2 },
  { id: 'wouya', theme: 'nouchi', emoji: '🌪️', label: 'Wouyaya', bg: '#ff5a5f', fg: '#ffffff', rot: 5 },
];
export const THEMES = [['recent', 'Récents'], ['reactions', 'Réactions'], ['nouchi', 'Nouchi']];
export const sticker = (id) => STICKERS.find((s) => s.id === id);

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** Un sticker dessiné en HTML/CSS (contour blanc, légère inclinaison). `size` = largeur en px. */
export function stickerHtml(id, size = 128) {
  const s = sticker(id); if (!s) return '';
  return `<span class="stk" style="--w:${size}px;--sbg:${s.bg};--sfg:${s.fg};--rot:${s.rot}deg" role="img" aria-label="Sticker ${esc(s.label)}"><span class="stk-e">${s.emoji}</span><span class="stk-t">${esc(s.label)}</span></span>`;
}
