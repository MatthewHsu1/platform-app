import { describe, expect, it } from 'vitest';

import { derivedId } from 'src/shared/utils/derived-id.util';
import { planPackagesAfterDone } from 'src/stock/utils/plan-packages-after-done.util';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';

const node = (fields: Partial<PackageNode> & { id: string }): PackageNode => ({
  name: fields.id,
  completeName: fields.id,
  parentPackageId: null,
  packageDestId: null,
  locationId: null,
  ...fields,
});
const line = (fields: {
  id: string;
  pickingId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
  locationId?: string;
  locationDestId?: string;
  quantityProductUom?: number;
}) => ({
  pickingId: 'B',
  productId: 'p',
  ownerId: null,
  lotId: null,
  packageId: null,
  resultPackageId: null,
  locationId: 'stock',
  locationDestId: 'output',
  quantityProductUom: 1,
  ...fields,
});
const locationNames = new Map([
  ['stock', 'WH/Stock'],
  ['output', 'WH/Output'],
  ['shelf', 'WH/Stock/Shelf 1'],
]);

describe('planPackagesAfterDone', () => {
  it('judges a container with the stock the other transfers of the click are about to move', () => {
    // Transfer B (done first) brings box1 to the pallet's place; transfer A, still to do, moves the
    // box already in the pallet to the same place.
    const plan = planPackagesAfterDone({
      lines: [line({ id: 'b1', packageId: 'box1', resultPackageId: 'box1' })],
      skipContainers: false,
      packages: new Map([
        ['box1', node({ id: 'box1', packageDestId: 'pallet' })],
        ['boxC', node({ id: 'boxC', parentPackageId: 'pallet' })],
        ['pallet', node({ id: 'pallet' })],
      ]),
      packageQuants: [
        { packageId: 'box1', locationId: 'output', quantity: 1 },
        { packageId: 'boxC', locationId: 'stock', quantity: 2 },
      ],
      pendingLines: [line({ id: 'a1', pickingId: 'A', packageId: 'boxC', resultPackageId: 'boxC', quantityProductUom: 2 })],
      locationNames,
    });

    expect(plan.containerWrites).toEqual([{ id: 'box1', parentPackageId: 'pallet', packageDestId: null }]);
    expect(plan.notes).toEqual([]);
  });

  it('drops every container move when one container is refused, and notes why on the transfer', () => {
    const plan = planPackagesAfterDone({
      lines: [
        line({ id: 'l1', resultPackageId: 'box1' }),
        line({ id: 'l2', resultPackageId: 'box2', locationDestId: 'shelf' }),
        line({ id: 'l3', resultPackageId: 'box3' }),
      ],
      skipContainers: false,
      packages: new Map([
        ['box1', node({ id: 'box1', name: 'Box1', packageDestId: 'pallet' })],
        ['box2', node({ id: 'box2', name: 'Box2', packageDestId: 'pallet' })],
        ['box3', node({ id: 'box3', packageDestId: 'crate' })],
        ['pallet', node({ id: 'pallet', name: 'Pallet' })],
        ['crate', node({ id: 'crate' })],
      ]),
      packageQuants: [
        { packageId: 'box1', locationId: 'output', quantity: 1 },
        { packageId: 'box2', locationId: 'shelf', quantity: 1 },
        { packageId: 'box3', locationId: 'output', quantity: 1 },
      ],
      pendingLines: [],
      locationNames,
    });

    expect(plan.containerWrites).toEqual([]);
    expect(plan.notes).toEqual([
      {
        id: derivedId('packagesNotPlaced', 'B', 'l1,l2,l3'),
        objectSingular: 'stockPicking',
        recordId: 'B',
        body: 'Packages Box1, Box2 are moved to different locations while being in the same container Pallet.',
      },
    ]);
  });

  it('notes a refusal on the container when the lines belong to no transfer', () => {
    const plan = planPackagesAfterDone({
      lines: [
        line({ id: 'l1', pickingId: null, resultPackageId: 'box1' }),
        line({ id: 'l2', pickingId: null, resultPackageId: 'box2', locationDestId: 'shelf' }),
      ],
      skipContainers: false,
      packages: new Map([
        ['box1', node({ id: 'box1', name: 'Box1', packageDestId: 'pallet' })],
        ['box2', node({ id: 'box2', name: 'Box2', packageDestId: 'pallet' })],
        ['pallet', node({ id: 'pallet', name: 'Pallet' })],
      ]),
      packageQuants: [
        { packageId: 'box1', locationId: 'output', quantity: 1 },
        { packageId: 'box2', locationId: 'shelf', quantity: 1 },
      ],
      pendingLines: [],
      locationNames,
    });

    expect(plan.notes.map((note) => [note.objectSingular, note.recordId])).toEqual([['stockPackage', 'pallet']]);
  });

  it('clears empty rows only for lines that kept their package', () => {
    const plan = planPackagesAfterDone({
      lines: [
        line({ id: 'kept', packageId: 'P', resultPackageId: 'P' }),
        line({ id: 'unpacked', packageId: 'Q', resultPackageId: null }),
        line({ id: 'packed', packageId: null, resultPackageId: 'R' }),
      ],
      skipContainers: true,
      packages: new Map(),
      packageQuants: [],
      pendingLines: [],
      locationNames,
    });

    expect(plan.emptyRowKeys).toEqual(['p|stock||P|', 'p|output||P|']);
    expect(plan.containerWrites).toEqual([]);
  });
});
