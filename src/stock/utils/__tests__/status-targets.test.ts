import { describe, expect, it } from 'vitest';

import {
  inInternalWarehouseLocation,
  isNotSnoozed,
  mainPackageIds,
  nextTransferIds,
  openLinePackageIds,
  statusTarget,
} from 'src/stock/utils/status-targets.util';

describe('nextTransferIds', () => {
  it('lists the transfers of the destination moves once, without the returns', () => {
    expect(nextTransferIds({ destinationPickingIds: ['pack', 'ship', 'pack', 'return1'], returnIds: ['return1'] })).toEqual([
      'pack',
      'ship',
    ]);
  });
});

describe('statusTarget', () => {
  it('opens the record itself when exactly one matches', () => {
    expect(statusTarget(['r1'])).toEqual({ kind: 'record', id: 'r1' });
  });

  it('opens a list for several and nothing for none', () => {
    expect(statusTarget(['r1', 'r2'])).toEqual({ kind: 'list', ids: ['r1', 'r2'] });
    expect(statusTarget([])).toEqual({ kind: 'none' });
  });
});

describe('openLinePackageIds', () => {
  it('takes the destination packages of the lines still to do, once', () => {
    expect(
      openLinePackageIds([
        { state: 'ASSIGNED', resultPackageId: 'box1' },
        { state: 'PARTIALLY_AVAILABLE', resultPackageId: 'box1' },
        { state: 'CONFIRMED', resultPackageId: 'box2' },
        { state: 'DONE', resultPackageId: 'box3' },
        { state: 'CANCEL', resultPackageId: 'box4' },
        { state: 'ASSIGNED', resultPackageId: null },
      ]),
    ).toEqual(['box1', 'box2']);
  });
});

describe('mainPackageIds', () => {
  it('keeps the pallet when two boxes are packed on it', () => {
    expect(
      mainPackageIds([
        { id: 'box1', containerId: 'pallet' },
        { id: 'box2', containerId: 'pallet' },
        { id: 'pallet', containerId: null },
      ]),
    ).toEqual(['pallet']);
  });

  it('keeps every package that goes into no other one', () => {
    expect(
      mainPackageIds([
        { id: 'box1', containerId: null },
        { id: 'box2', containerId: '' },
        { id: 'box3', containerId: 'box1' },
      ]),
    ).toEqual(['box1', 'box2']);
  });
});

describe('isNotSnoozed', () => {
  it('keeps rules never snoozed or snoozed until today or earlier', () => {
    expect(isNotSnoozed(null, '2026-10-11')).toBe(true);
    expect(isNotSnoozed('', '2026-10-11')).toBe(true);
    expect(isNotSnoozed('2026-10-11', '2026-10-11')).toBe(true);
    expect(isNotSnoozed('2026-10-10', '2026-10-11')).toBe(true);
  });

  it('leaves out rules snoozed past today', () => {
    expect(isNotSnoozed('2026-10-12', '2026-10-11')).toBe(false);
  });
});

describe('inInternalWarehouseLocation', () => {
  it('keeps internal locations that belong to a warehouse', () => {
    expect(inInternalWarehouseLocation({ usage: 'INTERNAL', warehouseId: 'wh', deletedAt: null })).toBe(true);
  });

  it('leaves out other kinds of location, internal ones outside a warehouse and missing ones', () => {
    expect(inInternalWarehouseLocation({ usage: 'TRANSIT', warehouseId: 'wh', deletedAt: null })).toBe(false);
    expect(inInternalWarehouseLocation({ usage: 'INTERNAL', warehouseId: null, deletedAt: null })).toBe(false);
    expect(inInternalWarehouseLocation(null)).toBe(false);
    expect(inInternalWarehouseLocation({ usage: 'INTERNAL', warehouseId: 'wh', deletedAt: '2026-10-01T00:00:00Z' })).toBe(false);
  });
});
