import { describe, expect, it } from 'vitest';

import { planLotLines } from 'src/stock/utils/plan-lot-lines.util';
import { type PlanLotLinesInput } from 'src/stock/utils/types/plan-lot-lines-input.type';

const base: PlanLotLinesInput = {
  mode: 'GENERATE',
  productFound: true,
  tracking: 'SERIAL',
  quantityReceived: 0,
  firstLot: '',
  count: 0,
  text: '',
  useExpirationDate: false,
  expirationTime: 0,
  scheduledDate: null,
  today: new Date('2025-09-13T08:30:00.000Z'),
  dateOrder: 'MONTH_FIRST',
  sequence: null,
};

describe('planLotLines', () => {
  it('makes one line of 1 per serial number', () => {
    expect(planLotLines({ ...base, firstLot: 'sn-t1-01', count: 5 })).toEqual({
      kind: 'lines',
      lines: ['sn-t1-01', 'sn-t1-02', 'sn-t1-03', 'sn-t1-04', 'sn-t1-05'].map((lotName) => ({
        lotName,
        quantity: 1,
        expirationDate: null,
      })),
      sequenceNumberNext: null,
    });
  });

  it('cuts the received quantity into lots of the given size', () => {
    const plan = planLotLines({ ...base, tracking: 'LOT', firstLot: 'lot01', count: 1, quantityReceived: 4 });

    expect(plan.kind === 'lines' && plan.lines).toEqual([
      { lotName: 'lot01', quantity: 1, expirationDate: null },
      { lotName: 'lot02', quantity: 1, expirationDate: null },
      { lotName: 'lot03', quantity: 1, expirationDate: null },
      { lotName: 'lot04', quantity: 1, expirationDate: null },
    ]);
  });

  it('makes no line when nothing was received', () => {
    const plan = planLotLines({ ...base, tracking: 'LOT', firstLot: '', count: 3, quantityReceived: 0 });

    expect(plan.kind === 'lines' && plan.lines).toEqual([]);
  });

  it('reads a negative received quantity as nothing received', () => {
    const plan = planLotLines({ ...base, tracking: 'LOT', firstLot: 'lot01', count: 2, quantityReceived: -3 });

    expect(plan.kind === 'lines' && plan.lines).toEqual([]);
  });

  it('refuses a quantity per lot that is not positive, and a missing product', () => {
    expect(planLotLines({ ...base, tracking: 'LOT', firstLot: 'a1', count: 0, quantityReceived: 5 })).toEqual({
      kind: 'refuse',
      reason: 'The quantity per lot should always be a positive value.',
    });
    expect(planLotLines({ ...base, productFound: false })).toEqual({
      kind: 'refuse',
      reason: 'No product found to generate Serials/Lots for.',
    });
  });

  it('refuses to generate no serial number', () => {
    expect(planLotLines({ ...base, firstLot: 'SN1', count: 0 })).toEqual({
      kind: 'refuse',
      reason: 'The number of Serial Numbers to generate must be greater than zero.',
    });
  });

  it('takes the pasted quantities, 1 when a row has none or 0', () => {
    const plan = planLotLines({ ...base, mode: 'IMPORT', tracking: 'LOT', text: 'abc;4\ndef\nghi;0' });

    expect(plan.kind === 'lines' && plan.lines).toEqual([
      { lotName: 'abc', quantity: 4, expirationDate: null },
      { lotName: 'def', quantity: 1, expirationDate: null },
      { lotName: 'ghi', quantity: 1, expirationDate: null },
    ]);
  });

  it('keeps imported dates and gives the others the scheduled date plus the expiration days', () => {
    const plan = planLotLines({
      ...base,
      mode: 'IMPORT',
      tracking: 'LOT',
      text: 'lot1;10;2025-12-31\nlot2;7\nlot3;3;1970-1-1',
      useExpirationDate: true,
      expirationTime: 10,
      scheduledDate: '2025-09-13T00:00:00.000Z',
    });

    expect(plan.kind === 'lines' && plan.lines).toEqual([
      { lotName: 'lot1', quantity: 10, expirationDate: '2025-12-31T00:00:00.000Z' },
      { lotName: 'lot2', quantity: 7, expirationDate: '2025-09-23T00:00:00.000Z' },
      { lotName: 'lot3', quantity: 3, expirationDate: '1970-01-01T00:00:00.000Z' },
    ]);
  });

  it('dates generated serials from the start of today when the transfer has no scheduled date', () => {
    const plan = planLotLines({
      ...base,
      firstLot: 'EXP1',
      count: 2,
      useExpirationDate: true,
      expirationTime: 2,
      today: new Date('2020-06-01T15:00:00.000Z'),
    });

    expect(plan.kind === 'lines' && plan.lines.map((line) => line.expirationDate)).toEqual([
      '2020-06-03T00:00:00.000Z',
      '2020-06-03T00:00:00.000Z',
    ]);
  });

  it('moves the product sequence past names that start at its last or next value', () => {
    const sequence = { prefix: '', padding: 7, numberNext: 34, numberIncrement: 1 };

    expect(planLotLines({ ...base, firstLot: '0000033', count: 3, sequence })).toMatchObject({ sequenceNumberNext: 36 });
    expect(planLotLines({ ...base, firstLot: '0000036', count: 3, sequence: { ...sequence, numberNext: 36 } })).toMatchObject({
      sequenceNumberNext: 39,
    });
    expect(planLotLines({ ...base, firstLot: 'SN52', count: 3, sequence: { ...sequence, numberNext: 39 } })).toMatchObject({
      sequenceNumberNext: null,
    });
  });

  it('leaves the sequence alone when no name was generated', () => {
    const sequence = { prefix: '', padding: 7, numberNext: 34, numberIncrement: 1 };

    expect(
      planLotLines({ ...base, tracking: 'LOT', firstLot: '0000033', count: 1, quantityReceived: 0, sequence }),
    ).toMatchObject({ sequenceNumberNext: null });
  });
});
