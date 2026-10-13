import { describe, expect, it } from 'vitest';

import { makeAutoprint } from 'src/stock/printing/make-autoprint';
import { type AutoprintDeps } from 'src/stock/printing/types/autoprint-deps.type';
import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';

const delivery: AutoprintPicking = {
  id: 'out',
  pickingTypeCode: 'OUTGOING',
  autoPrintDeliverySlip: true,
  autoPrintReturnSlip: true,
  autoPrintReceptionReport: false,
  autoPrintReceptionReportLabels: false,
  autoPrintProductLabels: false,
  productLabelFormat: 'PRICE_2X7',
  autoPrintLotLabels: false,
  lotLabelFormat: 'LOTS_4X12',
  autoPrintPackages: true,
  hasDestinationMoves: false,
  hasLots: false,
  hasResultPackages: true,
};

const move = (overrides: Partial<ReceptionMove>): ReceptionMove => ({
  id: 'm',
  createdAt: '2026-10-01T00:00:00.000Z',
  productId: 'P',
  isStorable: true,
  state: 'DONE',
  productQty: 4,
  quantity: 4,
  date: '2026-10-01T00:00:00.000Z',
  reservationDate: null,
  priority: 'NORMAL',
  locationId: 'wh2-stock',
  pickingId: 'IN',
  pickingName: null,
  pickingScheduledDate: null,
  moveOrigIds: [],
  moveDestIds: [],
  ...overrides,
});

const deps = (overrides: Partial<AutoprintDeps>): AutoprintDeps => ({
  hasPersonToken: () => true,
  readAutoprintPickings: async () => [delivery],
  createPrintPass: async (input) => ({ link: { report: input.report as never, pass: `pass-${input.report}` } }),
  readReceptionFlags: async () => ({ pickingIds: ['IN'], warehouseIds: ['wh1', 'wh2'] }),
  readReceptionMoves: async () => [move({}), move({ id: 'out', state: 'CONFIRMED', productQty: 3, pickingId: 'OUT' })],
  readWarehouseLocationIds: async () => new Set(['wh1-stock', 'wh2-stock']),
  ...overrides,
});

describe('autoprint', () => {
  it('leaves out a print that fails or has nothing to print and keeps the others', async () => {
    const { autoprint } = makeAutoprint(
      deps({
        createPrintPass: async (input) => {
          if (input.report === 'returnSlip') {
            throw new Error('timeout');
          }
          return input.report === 'pickingPackages' ? null : { link: { report: 'deliverySlip', pass: 'pass-deliverySlip' } };
        },
      }),
    );

    expect(await autoprint(['out'], 'UTC')).toEqual([{ report: 'deliverySlip', pass: 'pass-deliverySlip' }]);
  });

  it('gives no prints when the transfers cannot be read', async () => {
    const { autoprint } = makeAutoprint(deps({ readAutoprintPickings: async () => Promise.reject(new Error('timeout')) }));

    expect(await autoprint(['out'], 'UTC')).toEqual([]);
  });

  it('gives no prints to a run with no user behind it', async () => {
    let read = false;
    const { autoprint, receptionReportToShow } = makeAutoprint(
      deps({
        hasPersonToken: () => false,
        readAutoprintPickings: async () => {
          read = true;
          return [delivery];
        },
      }),
    );

    expect(await autoprint(['out'], 'UTC')).toEqual([]);
    expect(await receptionReportToShow(['IN'])).toEqual([]);
    expect(read).toBe(false);
  });
});

describe('receptionReportToShow', () => {
  it("opens the report when a delivery in any of the flagged types' warehouses waits for the received product", async () => {
    let asked: string[] = [];
    const { receptionReportToShow } = makeAutoprint(
      deps({
        readWarehouseLocationIds: async (warehouseIds) => {
          asked = warehouseIds;
          return new Set(['wh1-stock', 'wh2-stock']);
        },
      }),
    );

    expect(await receptionReportToShow(['IN'])).toEqual(['IN']);
    expect(asked).toEqual(['wh1', 'wh2']);
  });

  it('opens nothing when a read fails', async () => {
    const { receptionReportToShow } = makeAutoprint(deps({ readReceptionMoves: async () => Promise.reject(new Error('timeout')) }));

    expect(await receptionReportToShow(['IN'])).toEqual([]);
  });
});
