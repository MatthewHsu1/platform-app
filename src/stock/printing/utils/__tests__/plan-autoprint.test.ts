import { describe, expect, it } from 'vitest';

import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { planAutoprint, receptionAutoShow } from 'src/stock/printing/utils/plan-autoprint.util';

const picking = (overrides: Partial<AutoprintPicking>): AutoprintPicking => ({
  id: 'p1',
  pickingTypeCode: 'INCOMING',
  autoPrintDeliverySlip: false,
  autoPrintReturnSlip: false,
  autoPrintReceptionReport: false,
  autoPrintReceptionReportLabels: false,
  autoPrintProductLabels: false,
  productLabelFormat: 'PRICE_2X7',
  autoPrintLotLabels: false,
  lotLabelFormat: 'LOTS_4X12',
  autoPrintPackages: false,
  hasDestinationMoves: false,
  hasLots: false,
  hasResultPackages: false,
  ...overrides,
});

describe('planAutoprint', () => {
  it('prints nothing when no flag is set', () => {
    expect(planAutoprint([picking({})])).toEqual([]);
  });

  it('keeps the order: slips, reception, product labels, lot labels, packages', () => {
    const all = picking({
      autoPrintDeliverySlip: true,
      autoPrintReturnSlip: true,
      autoPrintReceptionReport: true,
      autoPrintReceptionReportLabels: true,
      autoPrintProductLabels: true,
      autoPrintLotLabels: true,
      autoPrintPackages: true,
      hasDestinationMoves: true,
      hasLots: true,
      hasResultPackages: true,
      lotLabelFormat: 'ZPL_UNITS',
    });
    expect(planAutoprint([all]).map((job) => [job.report, job.options])).toEqual([
      ['deliverySlip', {}],
      ['returnSlip', {}],
      ['receptionReport', {}],
      ['receptionReportLabels', {}],
      ['productLabels', { format: 'PRICE_2X7', moveQuantity: 'MOVE' }],
      ['lotLabelZpl', { labelQuantity: 'UNITS' }],
      ['pickingPackages', {}],
    ]);
  });

  it('prints lot labels on the sheet, one per lot, for a lots-per-sheet format', () => {
    expect(planAutoprint([picking({ autoPrintLotLabels: true, hasLots: true, lotLabelFormat: 'LOTS_4X12' })])).toEqual([
      { report: 'lotLabelPdf', pickingIds: ['p1'], options: { labelQuantity: 'LOTS' } },
    ]);
  });

  it('skips the reception items on deliveries and when nothing waits downstream', () => {
    expect(
      planAutoprint([
        picking({ id: 'out', pickingTypeCode: 'OUTGOING', autoPrintReceptionReport: true, autoPrintReceptionReportLabels: true, hasDestinationMoves: true }),
        picking({ id: 'in', autoPrintReceptionReport: true, hasDestinationMoves: false }),
      ]),
    ).toEqual([]);
  });

  it('groups product labels by format, lot labels only for transfers with lots, packages only with result packages', () => {
    const jobs = planAutoprint([
      picking({ id: 'a', autoPrintProductLabels: true, productLabelFormat: 'ZPL', autoPrintLotLabels: true, hasLots: false, autoPrintPackages: true }),
      picking({ id: 'b', autoPrintProductLabels: true, productLabelFormat: 'DYMO' }),
      picking({ id: 'c', autoPrintProductLabels: true, productLabelFormat: 'ZPL' }),
    ]);
    expect(jobs).toEqual([
      { report: 'productLabels', pickingIds: ['a', 'c'], options: { format: 'ZPL', moveQuantity: 'MOVE' } },
      { report: 'productLabels', pickingIds: ['b'], options: { format: 'DYMO', moveQuantity: 'MOVE' } },
    ]);
  });
});

describe('receptionAutoShow', () => {
  const lines = [{ productId: 'P', isStorable: true, state: 'DONE', quantity: 4, hasDestinationMoves: false }];
  const waiting = { productId: 'P', state: 'CONFIRMED', productQty: 3, locationId: 'stock', pickingId: 'OUT', hasOrigins: false };

  it('opens the report when a delivery of the warehouse waits for the received product', () => {
    expect(receptionAutoShow({ flaggedPickingIds: ['IN'], lines, candidateOuts: [waiting], warehouseLocationIds: new Set(['stock']) })).toBe(true);
  });

  it('does not when the received moves already feed a destination, or the delivery has origins', () => {
    expect(
      receptionAutoShow({
        flaggedPickingIds: ['IN'],
        lines: [{ ...lines[0], hasDestinationMoves: true }],
        candidateOuts: [waiting],
        warehouseLocationIds: new Set(['stock']),
      }),
    ).toBe(false);
    expect(
      receptionAutoShow({ flaggedPickingIds: ['IN'], lines, candidateOuts: [{ ...waiting, hasOrigins: true }], warehouseLocationIds: new Set(['stock']) }),
    ).toBe(false);
  });
});
