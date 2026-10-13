import { describe, expect, it } from 'vitest';

import { orderTrimLists } from 'src/shared/install/utils/order-trim-lists.util';

const list = (universalIdentifier: string) => ({ universalIdentifier });

describe('orderTrimLists', () => {
  it('trims the lists staff open first before the others, which keep their order', () => {
    const ordered = orderTrimLists([list('picking'), list('lead'), list('product')], ['lead']);

    expect(ordered.map((object) => object.universalIdentifier)).toEqual(['lead', 'picking', 'product']);
  });

  it('trims only the named lists when asked to', () => {
    const ordered = orderTrimLists([list('picking'), list('lead'), list('product')], ['lead'], { onlyFirst: true });

    expect(ordered.map((object) => object.universalIdentifier)).toEqual(['lead']);
  });
});
