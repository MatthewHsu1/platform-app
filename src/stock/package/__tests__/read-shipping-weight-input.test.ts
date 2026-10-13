import { describe, expect, it } from 'vitest';

import { makePickingsWeighingPackages } from 'src/stock/package/read-shipping-weight-input';

describe('pickingsWeighingPackages', () => {
  it('weighs a done transfer again, with the open ones, when a package of its tree changes', async () => {
    const lines = [
      { resultPackageId: 'box', pickingId: 'done-delivery', state: 'DONE' },
      { resultPackageId: 'pallet', pickingId: 'open-delivery', state: 'ASSIGNED' },
      { resultPackageId: 'other', pickingId: 'unrelated', state: 'ASSIGNED' },
    ];
    const weighing = makePickingsWeighingPackages({
      readTreeIds: async () => ['box', 'pallet'],
      readLinesInto: async (packageIds) => lines.filter((line) => packageIds.includes(line.resultPackageId)),
    });

    expect((await weighing(['box'])).sort()).toEqual(['done-delivery', 'open-delivery']);
  });
});
