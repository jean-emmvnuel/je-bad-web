// Avatars « Badeur » : visages générés (portage de FaceAvatar mobile).
const BGS = ['#2b2929', '#3a1d5c', '#1f3b33', '#3b2a12', '#3a1730', '#13314a', '#4A1477', '#2d2440'];
const HEADS = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#5C3A21', '#A86B3C', '#B76BFF', '#3DDC97', '#FFC93C', '#FF8FB8', '#7FD3FF'];
const ACCENTS = ['#9810e6', '#FFC93C', '#FF5A5F', '#3DDC97', '#4FC3F7', '#F4F1F1'];
const SHAPES = ['round', 'blob', 'tall'];
const EYES = ['dots', 'happy', 'wink', 'shades', 'big', 'sleepy'];
const MOUTHS = ['laugh', 'grin', 'open', 'tongue', 'smirk'];
const EXTRAS = ['none', 'cap', 'tuft', 'blush', 'headband', 'none'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const INK = '#1a1919';

export const randomFace = () => ({ bg: pick(BGS), head: pick(HEADS), shape: pick(SHAPES), eyes: pick(EYES), mouth: pick(MOUTHS), extra: pick(EXTRAS), accent: pick(ACCENTS) });
export function facePalette(n = 20) {
  const out = []; const seen = new Set();
  while (out.length < n) { const a = randomFace(); const k = a.head + a.eyes + a.mouth; if (!seen.has(k)) { seen.add(k); out.push(a); } }
  return out;
}

function head(a) {
  if (a.shape === 'blob') return `<rect x="17" y="22" width="66" height="64" rx="26" fill="${a.head}"/>`;
  if (a.shape === 'tall') return `<ellipse cx="50" cy="55" rx="30" ry="35" fill="${a.head}"/>`;
  return `<circle cx="50" cy="55" r="33" fill="${a.head}"/>`;
}
function eyes(a) {
  const y = 50;
  switch (a.eyes) {
    case 'happy': return `<path d="M33 ${y + 2}q5-7 10 0M57 ${y + 2}q5-7 10 0" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    case 'wink': return `<circle cx="38" cy="${y}" r="4" fill="${INK}"/><path d="M57 ${y}h10" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'shades': return `<rect x="27" y="${y - 7}" width="20" height="12" rx="5" fill="${INK}"/><rect x="53" y="${y - 7}" width="20" height="12" rx="5" fill="${INK}"/><path d="M47 ${y - 3}h6" stroke="${INK}" stroke-width="3"/>`;
    case 'big': return `<circle cx="38" cy="${y}" r="8" fill="#fff"/><circle cx="62" cy="${y}" r="8" fill="#fff"/><circle cx="40" cy="${y + 1}" r="4" fill="${INK}"/><circle cx="64" cy="${y + 1}" r="4" fill="${INK}"/>`;
    case 'sleepy': return `<path d="M32 ${y}q6 5 12 0M56 ${y}q6 5 12 0" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    default: return `<circle cx="38" cy="${y}" r="4" fill="${INK}"/><circle cx="62" cy="${y}" r="4" fill="${INK}"/>`;
  }
}
function mouth(a) {
  const y = 64;
  switch (a.mouth) {
    case 'laugh': return `<path d="M36 ${y}H64A14 14 0 0 1 36 ${y}Z" fill="${INK}"/><path d="M39 ${y}h22v4a2 2 0 0 1-2 2h-18a2 2 0 0 1-2-2Z" fill="#fff"/>`;
    case 'tongue': return `<path d="M36 ${y}H64A14 14 0 0 1 36 ${y}Z" fill="${INK}"/><path d="M43 ${y + 10}a7 5 0 0 1 14 0a14 14 0 0 1-14 0Z" fill="#FF6FA8"/>`;
    case 'open': return `<ellipse cx="50" cy="${y + 5}" rx="7" ry="8" fill="${INK}"/>`;
    case 'smirk': return `<path d="M40 ${y + 4}q10 6 20-4" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    default: return `<path d="M38 ${y + 1}q12 12 24 0" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
  }
}
function extra(a) {
  switch (a.extra) {
    case 'cap': return `<path d="M20 38a30 26 0 0 1 60 0Z" fill="${a.accent}"/><rect x="46" y="30" width="44" height="8" rx="4" fill="${a.accent}"/>`;
    case 'tuft': return `<path d="M44 24q2-12 8-14q-2 8 4 4q-3 9-6 12Z" fill="${INK}"/>`;
    case 'blush': return `<g opacity="0.55"><ellipse cx="30" cy="61" rx="6" ry="4" fill="#FF6FA8"/><ellipse cx="70" cy="61" rx="6" ry="4" fill="#FF6FA8"/></g>`;
    case 'headband': return `<rect x="18" y="33" width="64" height="8" rx="4" fill="${a.accent}"/>`;
    default: return '';
  }
}
export const faceSvg = (a) => `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="${a.bg}"/>${head(a)}${extra(a)}${eyes(a)}${mouth(a)}</svg>`;
