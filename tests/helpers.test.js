import { describe, expect, it } from 'vitest';
import { MAX_BYTES, readImageFile } from '../js/cropper.js';
import { STICKERS, sticker, stickerHtml } from '../js/stickers.js';
import { avatar, esc, rich } from '../js/ui.js';
import * as S from '../js/store.js';

describe('Choix d’une image (F1 RG2)', () => {
  it('refuse les formats autres que JPG, PNG, WebP', async () => {
    await expect(readImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow(/Format non accepté/);
  });
  it('refuse une image de plus de 10 Mo', async () => {
    const big = new File([new Uint8Array(MAX_BYTES + 1)], 'a.jpg', { type: 'image/jpeg' });
    await expect(readImageFile(big)).rejects.toThrow(/10 Mo/);
  });
  it('lit une image valide en data URL', async () => {
    const url = await readImageFile(new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' }));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('Stickers', () => {
  it('16 stickers On Bade, identifiants uniques, en deux thèmes', () => {
    expect(STICKERS).toHaveLength(16);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(16);
    expect(new Set(STICKERS.map((s) => s.theme))).toEqual(new Set(['reactions', 'nouchi']));
  });
  it('un sticker retiré par la modération s’affiche comme tel', () => {
    S.resetAll(); S.customSticker('us1').removed = true;
    expect(stickerHtml('us1')).toContain('retiré par la modération');
  });
  it('un sticker inconnu ne casse pas l’affichage', () => { expect(sticker('nope')).toBeUndefined(); expect(stickerHtml('nope')).toBe(''); });
});

describe('Affichage sûr', () => {
  it('échappe le HTML des contenus des utilisateurs', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(rich('<b>@Koffi225</b>')).toBe('&lt;b&gt;<span class="mention">@Koffi225</span>&lt;/b&gt;');
  });
  it('avatar : masque pour l’anonyme, photo si elle existe, initiale sinon', () => {
    expect(avatar(null)).toContain('Badeur anonyme');
    expect(avatar({ pseudo: 'Awa', hue: 10, photo: 'data:x' })).toContain('<img src="data:x"');
    expect(avatar({ pseudo: 'awa', hue: 10 })).toContain('>A<');
  });
});
