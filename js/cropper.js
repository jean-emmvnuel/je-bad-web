// Recadrage d'image avant publication (F1, RG2). Pour un fil uniforme, deux formats seulement :
// portrait 4:5 (par défaut) et carré 1:1. Rotation, zoom (molette, curseur, pincement), déplacement, poignées.
// Sortie : JPEG 1 080 px de large maximum, sans métadonnées (le canvas ne les recopie pas).
import { esc, icon, reduceMotion } from './ui.js';

export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPT = 'image/jpeg,image/png,image/webp';
const ALL_RATIOS = [['4:5', 'Portrait', 4 / 5], ['1:1', 'Carré', 1]];
const MIN_FRAME = 72, PAD = 20;

/** Lit un fichier choisi : refuse les formats et tailles hors règle. */
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('none'));
    if (!ACCEPT.split(',').includes(file.type)) return reject(new Error('Format non accepté : JPG, PNG ou WebP.'));
    if (file.size > MAX_BYTES) return reject(new Error('Image trop lourde : 10 Mo maximum.'));
    const r = new FileReader();
    r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Lecture impossible.'));
    r.readAsDataURL(file);
  });
}

/**
 * Ouvre l'éditeur plein écran. `src` = data URL de l'original.
 * `opts.ratios` (['4:5', '1:1'] ; ['1:1'] pour un sticker), `opts.outMax` (1 080 ; 512 pour un sticker), `opts.title`.
 * Résout { dataUrl, ratio, w, h, crop } (crop = réglages pour rouvrir l'éditeur) ou null si annulé.
 */
export function openCropper(src, initial = {}, opts = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => mount(img, initial, resolve, opts);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function mount(img, initial, resolve, { ratios = ['4:5', '1:1'], outMax = 1080, title = 'Recadrer' } = {}) {
  const RATIOS = ALL_RATIOS.filter((r) => ratios.includes(r[0]));
  const OUT_MAX = outMax;
  const root = document.createElement('div');
  root.className = 'cropper';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', "Recadrer l'image");
  root.innerHTML = `
    <header class="cropper-bar"><button class="btn btn-ghost btn-sm" data-cancel>Annuler</button><h2 class="t-heading">${esc(title)}</h2><button class="btn btn-primary btn-sm" data-ok>Valider</button></header>
    <div class="cropper-stage" data-stage>
      <img alt="" draggable="false" data-img/>
      <div class="cropper-frame" data-frame><i class="g g1"></i><i class="g g2"></i><i class="g g3"></i><i class="g g4"></i>
        ${['nw', 'ne', 'sw', 'se'].map((c) => `<span class="h h-${c}" data-h="${c}"></span>`).join('')}</div>
    </div>
    <div class="cropper-tools">
      ${RATIOS.length > 1 ? `<div class="seg" role="radiogroup" aria-label="Format">${RATIOS.map(([k, l]) => `<button role="radio" data-r="${k}"><b>${esc(k)}</b><span>${l}</span></button>`).join('')}</div>` : ''}
      <div class="cropper-row"><span class="t-small muted">${icon('image')}</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom" data-zoom/><button class="icon-btn" data-rot aria-label="Tourner de 90°">${icon('rotate')}</button></div>
    </div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  const stage = root.querySelector('[data-stage]'), el = root.querySelector('[data-img]'), frameEl = root.querySelector('[data-frame]'), zoom = root.querySelector('[data-zoom]');
  el.src = img.src;

  let ratioKey = ratios.includes(initial.ratioKey) ? initial.ratioKey : ratios[0], rot = initial.rot ?? 0;
  let SW, SH, W, H, minS, s, cx, cy, f; // f = cadre {x, y, w, h} dans la scène
  const ratioOf = () => RATIOS.find((r) => r[0] === ratioKey)[2];
  const dims = () => { W = rot % 180 ? img.naturalHeight : img.naturalWidth; H = rot % 180 ? img.naturalWidth : img.naturalHeight; };

  function reset() {
    dims(); SW = stage.clientWidth; SH = stage.clientHeight;
    const r = ratioOf(), aw = SW - 2 * PAD, ah = SH - 2 * PAD;
    const fw = Math.min(aw, ah * r), fh = fw / r;
    f = { x: (SW - fw) / 2, y: (SH - fh) / 2, w: fw, h: fh };
    minS = Math.max(f.w / W, f.h / H); s = minS; cx = SW / 2; cy = SH / 2;
    zoom.value = 1;
    root.querySelectorAll('[data-r]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.r === ratioKey)));
    draw();
  }
  function clamp() {
    minS = Math.max(f.w / W, f.h / H); s = Math.max(s, minS);
    const hw = (W * s) / 2, hh = (H * s) / 2;
    cx = Math.min(f.x + hw, Math.max(f.x + f.w - hw, cx));
    cy = Math.min(f.y + hh, Math.max(f.y + f.h - hh, cy));
  }
  function draw() {
    clamp();
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    Object.assign(el.style, { width: `${iw}px`, height: `${ih}px`, left: `${cx}px`, top: `${cy}px`, transform: `translate(-50%, -50%) rotate(${rot}deg)` });
    Object.assign(frameEl.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px` });
    zoom.value = String(Math.min(4, s / minS));
  }

  // Déplacement, pincement, poignées
  const ptrs = new Map(); let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const h = e.target.closest('[data-h]')?.dataset.h;
    if (h) drag = { kind: 'handle', h, f0: { ...f }, x0: e.clientX, y0: e.clientY };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: s }; }
    else drag = { kind: 'pan', x0: e.clientX, y0: e.clientY, cx0: cx, cy0: cy };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId) || !drag) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.kind === 'pan') { cx = drag.cx0 + e.clientX - drag.x0; cy = drag.cy0 + e.clientY - drag.y0; }
    if (drag.kind === 'pinch' && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; s = drag.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / drag.d0); }
    if (drag.kind === 'handle') resizeFrame(drag, e.clientX - drag.x0, e.clientY - drag.y0);
    draw();
  });
  const end = (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) drag = null; else if (drag?.kind === 'pinch') drag = null; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); s *= Math.exp(-e.deltaY * 0.0015); draw(); }, { passive: false });

  function resizeFrame({ h, f0 }, dx, dy) {
    const r = RATIOS.find((x) => x[0] === ratioKey)[2];
    // Le coin opposé reste fixe ; le cadre reste dans la scène et dans l'image.
    const ax = h.includes('w') ? f0.x + f0.w : f0.x, ay = h.includes('n') ? f0.y + f0.h : f0.y;
    let w = Math.max(MIN_FRAME, f0.w + (h.includes('w') ? -dx : dx)), hh = Math.max(MIN_FRAME, f0.h + (h.includes('n') ? -dy : dy));
    if (r) { if (w / hh > r) w = hh * r; else hh = w / r; }
    const imgL = cx - (W * s) / 2, imgT = cy - (H * s) / 2, imgR = imgL + W * s, imgB = imgT + H * s;
    const maxW = h.includes('w') ? ax - Math.max(PAD / 2, imgL) : Math.min(SW - PAD / 2, imgR) - ax;
    const maxH = h.includes('n') ? ay - Math.max(PAD / 2, imgT) : Math.min(SH - PAD / 2, imgB) - ay;
    if (w > maxW) { w = maxW; if (r) hh = w / r; }
    if (hh > maxH) { hh = maxH; if (r) w = hh * r; }
    f = { x: h.includes('w') ? ax - w : ax, y: h.includes('n') ? ay - hh : ay, w, h: hh };
  }

  zoom.oninput = () => { s = minS * Number(zoom.value); draw(); };
  root.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { ratioKey = b.dataset.r; reset(); }));
  root.querySelector('[data-rot]').onclick = () => { rot = (rot + 90) % 360; reset(); };

  const close = (val) => {
    removeEventListener('resize', onResize); removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    const done = () => { root.remove(); resolve(val); };
    if (reduceMotion()) done(); else gsap.to(root, { opacity: 0, duration: 0.18, onComplete: done });
  };
  const onResize = () => reset();
  const onKey = (e) => { if (e.key === 'Escape') close(null); };
  addEventListener('resize', onResize); addEventListener('keydown', onKey);
  root.querySelector('[data-cancel]').onclick = () => close(null);
  root.querySelector('[data-ok]').onclick = () => close(exportCrop());

  function exportCrop() {
    // Image tournée dans un canvas, puis découpe de la zone du cadre.
    const full = document.createElement('canvas'); full.width = W; full.height = H;
    const g = full.getContext('2d');
    g.translate(W / 2, H / 2); g.rotate((rot * Math.PI) / 180); g.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const sx = (f.x - (cx - (W * s) / 2)) / s, sy = (f.y - (cy - (H * s) / 2)) / s, sw = f.w / s, sh = f.h / s;
    const ow = Math.round(Math.min(OUT_MAX, sw)), oh = Math.round((ow * sh) / sw);
    const out = document.createElement('canvas'); out.width = ow; out.height = oh;
    const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.fillStyle = '#1a1919'; o.fillRect(0, 0, ow, oh);
    o.drawImage(full, sx, sy, sw, sh, 0, 0, ow, oh);
    return { dataUrl: out.toDataURL('image/jpeg', 0.84), ratio: ow / oh, w: ow, h: oh, crop: { ratioKey, rot } };
  }

  requestAnimationFrame(() => { reset(); if (!reduceMotion()) gsap.from(root, { opacity: 0, duration: 0.2 }); });
}
