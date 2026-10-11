import { describe, expect, it } from 'vitest';

import {
  findDeliveriesByLot,
  traceabilityLines,
  traceabilityPrevious,
  traceabilityUpstream,
} from 'src/stock/utils/traceability.util';
import { type TraceLine } from 'src/stock/utils/types/trace-line.type';

const line = (overrides: Partial<TraceLine> & Pick<TraceLine, 'id'>): TraceLine => ({
  moveId: `${overrides.id}-move`,
  moveDate: '2026-10-01T10:00:00.000Z',
  date: '2026-10-01T10:00:00.000Z',
  state: 'DONE',
  productId: 'treadmill',
  productName: 'Treadmill',
  lotId: 'L',
  lotName: 'L',
  quantityProductUom: 1,
  uomName: 'Units',
  locationId: 'stock',
  locationName: 'WH/Stock',
  locationUsage: 'INTERNAL',
  locationDestId: 'shelf',
  locationDestName: 'WH/Stock/Shelf',
  locationDestUsage: 'INTERNAL',
  pickingId: null,
  pickingName: null,
  pickingTypeCode: null,
  pickingDateDone: null,
  partnerId: null,
  partnerName: null,
  partnerObject: null,
  isInventory: false,
  scrapId: null,
  scrapName: null,
  moveOrigIds: [],
  ...overrides,
});

// Lot L of a treadmill: received from Acme, moved to a shelf, delivered to Gym A.
const receipt = line({
  id: 'in1',
  moveDate: '2026-10-01T10:00:00.000Z',
  date: '2026-10-01T10:00:00.000Z',
  locationId: 'vendors',
  locationName: 'Partners/Vendors',
  locationUsage: 'SUPPLIER',
  locationDestId: 'stock',
  locationDestName: 'WH/Stock',
  pickingId: 'IN1',
  pickingName: 'WH/IN/00001',
  pickingTypeCode: 'INCOMING',
  partnerId: 'acme',
  partnerName: 'Acme',
  partnerObject: 'company',
});
const internal = line({
  id: 'int1',
  moveDate: '2026-10-02T10:00:00.000Z',
  date: '2026-10-02T10:00:00.000Z',
  pickingId: 'INT1',
  pickingName: 'WH/INT/00001',
  pickingTypeCode: 'INTERNAL',
});
const delivery = line({
  id: 'out1',
  moveDate: '2026-10-03T10:00:00.000Z',
  date: '2026-10-03T10:00:00.000Z',
  locationId: 'shelf',
  locationName: 'WH/Stock/Shelf',
  locationDestId: 'customers',
  locationDestName: 'Partners/Customers',
  locationDestUsage: 'CUSTOMER',
  pickingId: 'OUT1',
  pickingName: 'WH/OUT/00001',
  pickingTypeCode: 'OUTGOING',
  pickingDateDone: '2026-10-03T10:00:00.000Z',
  partnerId: 'gymA',
  partnerName: 'Gym A',
  partnerObject: 'person',
});
const doneLines = [receipt, internal, delivery];

const picking = (recordId: string) => ({ objectNameSingular: 'stockPicking', recordId });

describe('traceabilityLines', () => {
  it('lists a lot newest first, with partners on receipts and deliveries', () => {
    expect(traceabilityLines({ model: 'stockLot', startLines: doneLines, doneLines, digits: 2 })).toEqual([
      {
        lineId: 'out1',
        reference: 'WH/OUT/00001',
        referenceRecord: picking('OUT1'),
        productName: 'Treadmill',
        date: '2026-10-03T10:00:00.000Z',
        lotId: 'L',
        lotName: 'L',
        from: 'WH/Stock/Shelf',
        fromRecord: null,
        to: 'Gym A',
        toRecord: { objectNameSingular: 'person', recordId: 'gymA' },
        quantity: '1.00 Units',
        usage: 'out',
        unfoldable: false,
        pickingId: 'OUT1',
      },
      {
        lineId: 'int1',
        reference: 'WH/INT/00001',
        referenceRecord: picking('INT1'),
        productName: 'Treadmill',
        date: '2026-10-02T10:00:00.000Z',
        lotId: 'L',
        lotName: 'L',
        from: 'WH/Stock',
        fromRecord: null,
        to: 'WH/Stock/Shelf',
        toRecord: null,
        quantity: '1.00 Units',
        usage: 'internal',
        unfoldable: false,
        pickingId: 'INT1',
      },
      {
        lineId: 'in1',
        reference: 'WH/IN/00001',
        referenceRecord: picking('IN1'),
        productName: 'Treadmill',
        date: '2026-10-01T10:00:00.000Z',
        lotId: 'L',
        lotName: 'L',
        from: 'Acme',
        fromRecord: { objectNameSingular: 'company', recordId: 'acme' },
        to: 'WH/Stock',
        toRecord: null,
        quantity: '1.00 Units',
        usage: 'in',
        unfoldable: false,
        pickingId: 'IN1',
      },
    ]);
  });

  it('lets a transfer line unfold when stock came from somewhere before it', () => {
    expect(traceabilityLines({ model: 'stockPicking', startLines: [delivery], doneLines, digits: 2 })[0].unfoldable).toBe(true);
  });

  it('does not let a line unfold when nothing came before it', () => {
    expect(traceabilityLines({ model: 'stockPicking', startLines: [receipt], doneLines, digits: 2 })[0].unfoldable).toBe(false);
  });

  it('names inventory adjustments and scraps, and links them to the move and the scrap', () => {
    const adjustment = line({ id: 'adj', isInventory: true, locationId: 'loss', locationUsage: 'INVENTORY' });
    const scrap = line({
      id: 'scr',
      scrapId: 'S1',
      scrapName: 'SP/00001',
      locationDestUsage: 'INVENTORY',
      locationDestId: 'scrap',
      locationDestName: 'Virtual/Scrap',
    });
    const rows = traceabilityLines({ model: 'stockLot', startLines: [adjustment, scrap], doneLines: [], digits: 2 });

    expect(rows.map((row) => [row.reference, row.referenceRecord])).toEqual([
      ['Inventory Adjustment', { objectNameSingular: 'stockMove', recordId: 'adj-move' }],
      ['SP/00001', { objectNameSingular: 'stockScrap', recordId: 'S1' }],
    ]);
  });
});

describe('traceabilityUpstream', () => {
  it('walks back through the locations the stock came from', () => {
    expect(traceabilityUpstream(delivery, doneLines).map((found) => found.id)).toEqual(['int1', 'in1']);
  });

  it('follows the origin moves of a chained move', () => {
    const pick = line({ id: 'pick', moveId: 'pick-move', locationId: 'stock', locationDestId: 'output' });
    const ship = line({ id: 'ship', moveId: 'ship-move', moveOrigIds: ['pick-move'], locationId: 'output', locationDestId: 'customers' });
    expect(traceabilityUpstream(ship, [pick, ship]).map((found) => found.id)).toEqual(['pick']);
  });

  it('skips lines done after the line it walks back from', () => {
    const later = line({ id: 'later', date: '2026-10-04T10:00:00.000Z', locationDestId: 'shelf' });
    expect(traceabilityUpstream(delivery, [...doneLines, later]).map((found) => found.id)).toEqual(['int1', 'in1']);
  });
});

describe('traceabilityPrevious', () => {
  it('unfolds one step back only; the step before stays folded under it', () => {
    expect(traceabilityPrevious(delivery, doneLines).map((found) => found.id)).toEqual(['int1']);
    expect(
      traceabilityLines({ model: 'stockMoveLine', startLines: traceabilityPrevious(delivery, doneLines), doneLines, digits: 2 }).map(
        (row) => [row.lineId, row.unfoldable],
      ),
    ).toEqual([['int1', true]]);
  });
});

describe('findDeliveriesByLot', () => {
  it('finds the delivery and its partner (a delivered serial number shows its customer)', () => {
    expect(findDeliveriesByLot(doneLines)).toEqual({ deliveryIds: ['OUT1'], partnerIds: ['gymA'] });
  });

  it('finds a delivery line that has no transfer of its own but whose move has one', () => {
    const orphan = { ...delivery, pickingId: 'OUT2', pickingName: 'WH/OUT/00002', partnerId: 'gymB' };
    expect(findDeliveriesByLot([orphan]).partnerIds).toEqual(['gymB']);
  });

  it('lists the customers of the latest delivery first, each once', () => {
    const first = { ...delivery, id: 'o1', pickingId: 'OUT1', pickingDateDone: '2026-10-03T10:00:00.000Z', partnerId: 'gymA' };
    const second = { ...delivery, id: 'o2', pickingId: 'OUT2', pickingDateDone: '2026-10-05T10:00:00.000Z', partnerId: 'gymB' };
    const third = { ...delivery, id: 'o3', pickingId: 'OUT3', pickingDateDone: '2026-10-07T10:00:00.000Z', partnerId: 'gymA' };
    expect(findDeliveriesByLot([first, second, third])).toEqual({ deliveryIds: ['OUT1', 'OUT2', 'OUT3'], partnerIds: ['gymA', 'gymB'] });
  });
});
