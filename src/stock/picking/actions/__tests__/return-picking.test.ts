import { describe, expect, it } from 'vitest';

import { makeReturnPicking } from 'src/stock/picking/actions/return-picking';
import { makeFakeReturnPort } from 'src/stock/picking/actions/__tests__/fakes/fake-return-port';
import { type ReturnData } from 'src/stock/picking/types/return-data.type';
import { type ReturnLinkMove } from 'src/stock/utils/types/return-link-move.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

const type = (values: Partial<PickingTypeRow>) => values as PickingTypeRow;
const linkMove = (values: Partial<ReturnLinkMove> & { id: string }): ReturnLinkMove => ({
  state: 'DONE',
  locationDestPath: null,
  originReturnedMoveId: null,
  moveOrigIds: [],
  moveDestIds: [],
  ...values,
});

// A done delivery of 10 A from Stock to Customers; the delivery type returns into Receipts.
const data: ReturnData = {
  picking: {
    id: 'out1',
    name: 'WH/OUT/00001',
    origin: 'SO001',
    state: 'DONE',
    locationId: 'stock',
    locationDestId: 'customers',
    pickingTypeId: 'typeOut',
    moveType: 'DIRECT',
    priority: 'NORMAL',
    scheduledDate: null,
    companyId: 'acme',
    personId: null,
    ownerId: null,
  } as PickingRow,
  note: { markdown: 'Ring twice' },
  types: new Map([
    ['typeOut', type({ id: 'typeOut', code: 'OUTGOING', defaultLocationDestId: 'customers', returnPickingTypeId: 'typeIn', warehouseId: 'wh', referenceSequenceId: 'seqOut' })],
    ['typeIn', type({ id: 'typeIn', code: 'INCOMING', defaultLocationDestId: 'stock', returnPickingTypeId: 'typeOut', warehouseId: 'wh', referenceSequenceId: 'seqIn' })],
  ]),
  moves: [
    {
      id: 'moveA',
      productId: 'productA',
      productUomId: 'unit',
      productUomQty: 10,
      quantity: 10,
      state: 'DONE',
      date: '2026-10-01T08:00:00.000Z',
      locationId: 'stock',
      locationDestId: 'customers',
      locationFinalId: null,
      propagateCancel: true,
      additional: false,
      isInventory: false,
    } as MoveRow,
  ],
  productNames: new Map([['productA', '[A1] Product A']]),
  locationUsage: new Map([['customers', 'CUSTOMER'], ['stock', 'INTERNAL']]),
  locationPath: new Map([['customers', 'customers/'], ['stock', 'wh/stock/']]),
  graph: new Map([['moveA', linkMove({ id: 'moveA', locationDestPath: 'customers/' })]]),
  destinationMoves: new Map([['moveA', []]]),
  referenceIds: ['ref1'],
};

const request = {
  pickingIds: ['out1'],
  rows: [{ moveId: 'moveA', quantity: 2 }],
  action: 'return' as const,
  locale: 'en',
};

describe('returnPicking', () => {
  it('makes the return transfer and its move, linked to the returned move, then confirms it', async () => {
    const { port, state } = makeFakeReturnPort(data, { crashAtWrite: null });
    const result = await makeReturnPicking(port).returnPicking(request);

    expect(state.pickings).toHaveLength(1);
    expect(state.pickings[0]).toMatchObject({
      name: 'WH/IN/00001',
      origin: 'Return of WH/OUT/00001',
      pickingTypeId: 'typeIn',
      returnPickingId: 'out1',
      locationId: 'customers',
      locationDestId: 'stock',
      note: { markdown: 'Ring twice' },
    });
    expect(state.moves).toEqual([
      expect.objectContaining({ productUomQty: 2, productUomId: 'unit', originReturnedMoveId: 'moveA', pickingId: result.returnPickingId }),
    ]);
    expect(state.moveLinks).toEqual([expect.objectContaining({ moveOrigId: 'moveA', moveDestId: state.moves[0].id })]);
    expect(state.referenceLinks).toEqual([expect.objectContaining({ referenceId: 'ref1', moveId: state.moves[0].id })]);
    expect(state.confirmed).toEqual([result.returnPickingId]);
  });

  it('a run stopped after any write and resumed ends with the same rows as a clean run', async () => {
    const clean = makeFakeReturnPort(data, { crashAtWrite: null });
    await makeReturnPicking(clean.port).returnPicking(request);
    const totalWrites = clean.writeCount();

    for (let crashAt = 1; crashAt <= totalWrites; crashAt += 1) {
      const { port, state } = makeFakeReturnPort(data, { crashAtWrite: crashAt });
      const engine = makeReturnPicking(port);

      await expect(engine.returnPicking(request)).rejects.toThrow('server stopped');
      await engine.resumeReturn('out1');

      expect({ crashAt, pickings: state.pickings.length, moves: state.moves.length, links: state.moveLinks.length, notes: state.notes.length, confirmed: state.confirmed.length, names: state.namesDrawn }).toEqual({
        crashAt,
        pickings: 1,
        moves: 1,
        links: 1,
        notes: 1,
        confirmed: 1,
        names: 1,
      });
      expect(state.claims.size).toBe(0);
    }
  });

  it('a run stopped before its commit point is dropped on resume, not finished', async () => {
    const { port, state } = makeFakeReturnPort(data, { crashAtWrite: null, crashAtCheck: true });
    const engine = makeReturnPicking(port);

    await expect(engine.returnPicking(request)).rejects.toThrow('server stopped');
    await engine.resumeReturn('out1');

    expect(state.pickings).toHaveLength(0);
    expect(state.claims.size).toBe(0);
  });

  it('refuses a return with only zero quantities before taking the claim', async () => {
    const { port, state } = makeFakeReturnPort(data, { crashAtWrite: null });

    await expect(
      makeReturnPicking(port).returnPicking({ ...request, rows: [{ moveId: 'moveA', quantity: 0 }] }),
    ).rejects.toThrow('Please specify at least one non-zero quantity.');
    expect(state.pickings).toHaveLength(0);
    expect(state.claims.size).toBe(0);
  });

  it('Return All returns the delivered quantity whatever was typed', async () => {
    const { port, state } = makeFakeReturnPort(data, { crashAtWrite: null });
    await makeReturnPicking(port).returnPicking({ ...request, action: 'returnAll', rows: [] });

    expect(state.moves[0]).toMatchObject({ productUomQty: 10 });
  });

  it('unreserves the open destination moves of every returned move, quantity typed or not', async () => {
    const twoMoves: ReturnData = {
      ...data,
      moves: [...data.moves, { ...data.moves[0], id: 'moveB', productId: 'productB' }],
      graph: new Map([
        ['moveA', linkMove({ id: 'moveA', locationDestPath: 'customers/', moveDestIds: ['nextA', 'doneA'] })],
        ['moveB', linkMove({ id: 'moveB', locationDestPath: 'customers/', moveDestIds: ['nextB'] })],
        ['nextA', linkMove({ id: 'nextA', state: 'ASSIGNED', moveOrigIds: ['moveA'] })],
        ['doneA', linkMove({ id: 'doneA', state: 'DONE', moveOrigIds: ['moveA'] })],
        ['nextB', linkMove({ id: 'nextB', state: 'CONFIRMED', moveOrigIds: ['moveB'] })],
      ]),
    };
    const { port, state } = makeFakeReturnPort(twoMoves, { crashAtWrite: null });
    await makeReturnPicking(port).returnPicking(request);

    expect(state.unreserved).toEqual(['nextA', 'nextB']);
  });

  it('an exchange of a delivery asks the rules for the replacement instead of making a transfer', async () => {
    const { port, state } = makeFakeReturnPort(data, { crashAtWrite: null });
    const result = await makeReturnPicking(port).returnPicking({ ...request, action: 'exchange' });

    expect(result.exchangePickingId).toBeNull();
    expect(state.pickings).toHaveLength(1);
    expect(state.procurements).toEqual([
      [
        {
          productId: 'productA',
          productQty: 2,
          productUomId: 'unit',
          locationId: 'customers',
          name: '[A1] Product A',
          origin: 'SO001',
          values: {
            references: ['ref1'],
            datePlanned: '2026-10-01T08:00:00.000Z',
            warehouse: 'wh',
            partner: 'acme',
            locationFinal: 'customers',
          },
        },
      ],
    ]);
    expect(state.checked).toEqual(state.procurements);
  });

  it('an exchange of a receipt makes a second transfer that receives the replacement, as a return of the return', async () => {
    const receiptData: ReturnData = {
      ...data,
      picking: { ...data.picking, id: 'in1', name: 'WH/IN/00009', locationId: 'vendors', locationDestId: 'stock', pickingTypeId: 'typeIn' },
      moves: [{ ...data.moves[0], locationId: 'vendors', locationDestId: 'stock' }],
      locationPath: new Map([['vendors', 'vendors/'], ['stock', 'wh/stock/']]),
      graph: new Map([['moveA', linkMove({ id: 'moveA', locationDestPath: 'wh/stock/' })]]),
    };
    const { port, state } = makeFakeReturnPort(receiptData, { crashAtWrite: null });
    const result = await makeReturnPicking(port).returnPicking({ ...request, pickingIds: ['in1'], action: 'exchange' });

    expect(state.pickings.map((picking) => [picking.pickingTypeId, picking.locationId, picking.locationDestId, picking.returnPickingId])).toEqual([
      ['typeOut', 'stock', 'vendors', 'in1'],
      ['typeIn', 'vendors', 'stock', result.returnPickingId],
    ]);
    expect(state.moves[1]).toMatchObject({ originReturnedMoveId: null, productUomQty: 2 });
    expect(state.confirmed).toEqual([result.returnPickingId, result.exchangePickingId]);
  });
});
