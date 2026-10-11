import { describe, expect, it } from 'vitest';

import { makeCheckTrackingBeforeCommit } from 'src/stock/lot/validate/check-tracking-before-commit';
import { type CheckTrackingStore } from 'src/stock/lot/types/check-tracking-store.type';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';
import { type ValidateMove } from 'src/stock/utils/types/validate-move.type';

const SANITY = 'You need to supply a Lot/Serial number for products Tracked by SN.';
const AT_DONE = 'You need to supply a Lot/Serial Number for product:\n- Tracked by SN';
const DUPLICATE =
  'The combination of lot/serial number and product must be unique within a company including when no company is defined.\nThe following combinations contain duplicates:\n - Product: Tracked by SN, Lot/Serial Number: SN9';

const line = (fields: Partial<ValidateLineRow> & { id: string }): ValidateLineRow => ({
  pickingId: 't',
  pickingName: 'WH/IN/00001',
  pickingUsesLots: true,
  moveId: 'm',
  productId: 'p',
  productName: 'Tracked by SN',
  tracking: 'SERIAL',
  quantity: 1,
  productUomId: 'unit',
  quantityProductUom: 1,
  picked: false,
  movePicked: false,
  moveState: 'ASSIGNED',
  isInventory: false,
  isScrap: false,
  hasPickingType: true,
  useCreateLots: true,
  useExistingLots: false,
  lotId: null,
  lotName: null,
  expirationDate: null,
  locationId: 'vendors',
  locationDestId: 'stock',
  moveLocationDestId: 'stock',
  state: 'ASSIGNED',
  packageId: null,
  resultPackageId: null,
  ...fields,
});

const move = (fields: Partial<ValidateMove> = {}): ValidateMove => ({
  id: 'm',
  pickingId: 't',
  state: 'ASSIGNED',
  quantity: 2,
  productUomQty: 2,
  picked: false,
  toInventory: false,
  isInventory: false,
  productUomId: 'unit',
  ...fields,
});

const check = (
  lines: ValidateLineRow[],
  moves: ValidateMove[],
  quants: { lotId: string; locationId: string; quantity: number }[] = [],
  packageQuants: { packageId: string; locationId: string; quantity: number }[] = [],
) => {
  const store: CheckTrackingStore = {
    readLines: async () => ({ lines, moves }),
    findLots: async (_productIds, names, lotIds) =>
      [{ id: 'sn1', name: 'SN1', productId: 'p' }].filter((lot) => names.includes(lot.name) || lotIds.includes(lot.id)),
    readSerialQuants: async () => quants.map((quant) => ({ ...quant, productId: 'p' })),
    readLocations: async () =>
      new Map([
        ['vendors', { parentPath: 'partners/vendors/', usage: 'SUPPLIER' as const }],
        ['stock', { parentPath: 'wh/stock/', usage: 'INTERNAL' as const }],
      ]),
    uoms: async () => new Map([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]),
    digits: () => 2,
    readPackageData: async (packageIds) => ({
      nodes: new Map(
        packageIds.map((id) => [id, { id, name: id, completeName: id, parentPackageId: null, packageDestId: null, locationId: 'stock' }]),
      ),
      packageQuants,
      locationNames: new Map(),
    }),
  };

  return makeCheckTrackingBeforeCommit(store);
};

describe('checkTrackingBeforeCommit', () => {
  it('answers with the transfer check first: a picked line without a lot stops it there', async () => {
    const lines = [line({ id: 'a', picked: true, movePicked: true }), line({ id: 'b', picked: true, movePicked: true, lotName: 'SN1' })];
    const run = check(lines, [move({ picked: true })], [{ lotId: 'sn1', locationId: 'stock', quantity: 1 }]);

    expect(await run(['t'], 'en')).toEqual([SANITY]);
    expect(await run(['t'], 'en', 'transfers')).toEqual([SANITY]);
  });

  it('checks the lines Validate commits only at the line stage, missing lots before duplicate names', async () => {
    const lines = [line({ id: 'a' }), line({ id: 'b', lotName: 'SN9' }), line({ id: 'c', lotName: 'SN9' })];
    const run = check(lines, [move({ quantity: 3, productUomQty: 3 })]);

    expect(await run(['t'], 'en', 'transfers')).toEqual([]);
    expect(await run(['t'], 'en', 'lines')).toEqual([AT_DONE]);
  });

  it('refuses a duplicate new name before counting serial numbers', async () => {
    const lines = [line({ id: 'b', lotName: 'SN9' }), line({ id: 'c', lotName: 'SN9' }), line({ id: 'd', lotId: 'sn1' })];
    const run = check(lines, [move({ quantity: 3, productUomQty: 3 })], [{ lotId: 'sn1', locationId: 'stock', quantity: 1 }]);

    expect(await run(['t'], 'en')).toEqual([DUPLICATE]);
  });

  it('refuses a serial number already in the place it arrives', async () => {
    const run = check([line({ id: 'd', lotId: 'sn1' })], [move({ quantity: 1, productUomQty: 1 })], [
      { lotId: 'sn1', locationId: 'stock', quantity: 1 },
    ]);

    expect(await run(['t'], 'en', 'lines')).toEqual(['The serial number has already been assigned: \n Product: Tracked by SN, Serial Number: SN1']);
  });

  it('refuses part of a package sent elsewhere while it keeps its package, untracked products too', async () => {
    const run = check(
      [line({ id: 'e', tracking: 'NONE', quantity: 4, quantityProductUom: 4, packageId: 'PACK1', resultPackageId: 'PACK1', locationId: 'stock', locationDestId: 'output' })],
      [move({ quantity: 4, productUomQty: 4 })],
      [],
      [{ packageId: 'PACK1', locationId: 'stock', quantity: 10 }],
    );

    expect(await run(['t'], 'en', 'lines')).toEqual([
      'You cannot move the same package content more than once in the same transfer or split the same package into two location.\nPackage: PACK1',
    ]);
  });

  it('answers with a package split over two places before a serial number counted twice', async () => {
    const run = check(
      [line({ id: 'd', lotId: 'sn1', packageId: 'PACK1', resultPackageId: 'PACK1', locationId: 'vendors', locationDestId: 'stock' })],
      [move({ quantity: 1, productUomQty: 1 })],
      [{ lotId: 'sn1', locationId: 'stock', quantity: 1 }],
      [{ packageId: 'PACK1', locationId: 'vendors', quantity: 2 }],
    );

    expect(await run(['t'], 'en', 'lines')).toEqual([
      'You cannot move the same package content more than once in the same transfer or split the same package into two location.\nPackage: PACK1',
    ]);
  });
});
