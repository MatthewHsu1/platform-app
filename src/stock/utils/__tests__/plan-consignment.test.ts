import { describe, expect, it } from 'vitest';

import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { planOwnerOnTransferDone } from 'src/stock/utils/plan-consignment.util';

describe('planOwnerOnTransferDone', () => {
  it("puts a receipt's stock on its owner's key", () => {
    const plan = planOwnerOnTransferDone({
      pickingOwnerId: 'owner1',
      moves: [{ id: 'm1', restrictPartnerId: null }],
      lines: [{ id: 'l1', ownerId: null }],
    });
    const line = {
      productId: 'productA',
      locationId: 'vendors',
      locationDestId: 'stock',
      lotId: null,
      packageId: null,
      resultPackageId: null,
      ownerId: 'owner1',
    };

    expect(plan).toEqual({
      moveUpdates: [{ id: 'm1', restrictPartnerId: 'owner1' }],
      lineUpdates: [{ id: 'l1', ownerId: 'owner1' }],
    });
    expect(sourceKeyOf(line)).toBe('productA|vendors|||owner1');
    expect(destinationKeyOf(line)).toBe('productA|stock|||owner1');
  });

  it('changes nothing without a transfer owner, or when the owner is already written', () => {
    expect(
      planOwnerOnTransferDone({ pickingOwnerId: null, moves: [{ id: 'm', restrictPartnerId: null }], lines: [{ id: 'l', ownerId: 'x' }] }),
    ).toEqual({ moveUpdates: [], lineUpdates: [] });
    expect(
      planOwnerOnTransferDone({ pickingOwnerId: 'o', moves: [{ id: 'm', restrictPartnerId: 'o' }], lines: [{ id: 'l', ownerId: 'o' }] }),
    ).toEqual({ moveUpdates: [], lineUpdates: [] });
  });
});
