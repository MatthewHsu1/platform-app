import { describe, expect, it } from 'vitest';

import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';

describe('groupTemplateIds', () => {
  it('groups a batch of events by product', () => {
    const events = [
      { recordId: 'v1', productTmplId: 'shirt' },
      { recordId: 'v2', productTmplId: 'mug' },
      { recordId: 'v3', productTmplId: 'shirt' },
    ];

    expect(groupTemplateIds(events, (event) => event.productTmplId)).toEqual(['shirt', 'mug']);
  });

  it('skips events that name no product', () => {
    expect(
      groupTemplateIds([{ productTmplId: null }, { productTmplId: 'mug' }], (event) => event.productTmplId),
    ).toEqual(['mug']);
  });
});
