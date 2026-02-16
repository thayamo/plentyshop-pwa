import { describe, expect, it } from 'vitest';
import { parseWishlistDebugRows } from '../../../modules/uptain/runtime/utils/debugAttributeParsers';

describe('parseWishlistDebugRows', () => {
  it('parses wishlist maps and returns value rows', () => {
    const input = JSON.stringify({
      564: { amount: 1, name: 'Dummyartikel', variants: '' },
    });

    expect(parseWishlistDebugRows(input)).toEqual([{ amount: 1, name: 'Dummyartikel', variants: '' }]);
  });

  it('parses HTML-escaped wishlist JSON (&quot;)', () => {
    const input = '{&quot;564&quot;:{&quot;amount&quot;:1,&quot;name&quot;:&quot;Dummyartikel&quot;,&quot;variants&quot;:&quot;&quot;}}';
    expect(parseWishlistDebugRows(input)).toEqual([{ amount: 1, name: 'Dummyartikel', variants: '' }]);
  });

  it('parses single wishlist objects', () => {
    const input = JSON.stringify({ amount: 1, name: 'Dummyartikel', variants: '' });
    expect(parseWishlistDebugRows(input)).toEqual([{ amount: 1, name: 'Dummyartikel', variants: '' }]);
  });

  it('returns null for invalid JSON', () => {
    expect(parseWishlistDebugRows('{nope')).toBeNull();
  });
});

