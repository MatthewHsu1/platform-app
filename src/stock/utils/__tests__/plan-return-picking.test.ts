import { describe, expect, it } from 'vitest';

import {
  pickReturnType,
  planReturnMove,
  planReturnMoveLinks,
  planReturnPicking,
} from 'src/stock/utils/plan-return-picking.util';
import { type ReturnLinkMove } from 'src/stock/utils/types/return-link-move.type';
import { type ReturnTypeInfo } from 'src/stock/utils/types/return-type-info.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

const receiptType: ReturnTypeInfo = {
  id: 'typeIn',
  code: 'INCOMING',
  defaultLocationDestId: 'stock',
  returnPickingTypeId: 'typeOut',
  warehouseId: 'wh',
  referenceSequenceId: 'seqIn',
};
const deliveryType: ReturnTypeInfo = {
  id: 'typeOut',
  code: 'OUTGOING',
  defaultLocationDestId: 'customers',
  returnPickingTypeId: 'typeIn',
  warehouseId: 'wh',
  referenceSequenceId: 'seqOut',
};
const internalType: ReturnTypeInfo = {
  id: 'typeInt',
  code: 'INTERNAL',
  defaultLocationDestId: 'stock',
  returnPickingTypeId: null,
  warehouseId: 'wh',
  referenceSequenceId: 'seqInt',
};
const types = new Map([receiptType, deliveryType, internalType].map((type) => [type.id, type]));

const delivery = {
  id: 'out1',
  name: 'WH/OUT/00001',
  locationId: 'stock',
  locationDestId: 'customers',
  pickingTypeId: 'typeOut',
  moveType: 'DIRECT' as const,
  priority: 'NORMAL' as const,
  scheduledDate: '2026-10-08T09:00:00.000Z',
  companyId: 'acme',
  personId: 'jean',
  ownerId: null,
};

describe('pickReturnType', () => {
  it('is the return type of the original type, else the original type', () => {
    expect(pickReturnType({ pickingType: deliveryType, types }).id).toBe('typeIn');
    expect(pickReturnType({ pickingType: internalType, types }).id).toBe('typeInt');
  });
});

describe('planReturnPicking', () => {
  it('a delivery comes back from the customer into the receipt type default destination', () => {
    expect(
      planReturnPicking({
        id: 'ret1',
        name: 'WH/IN/00007',
        origin: 'Return of WH/OUT/00001',
        picking: delivery,
        pickingType: deliveryType,
        types,
      }),
    ).toEqual({
      id: 'ret1',
      name: 'WH/IN/00007',
      origin: 'Return of WH/OUT/00001',
      state: 'DRAFT',
      pickingTypeId: 'typeIn',
      pickingTypeCode: 'INCOMING',
      returnPickingId: 'out1',
      locationId: 'customers',
      locationDestId: 'stock',
      moveType: 'DIRECT',
      priority: 'NORMAL',
      scheduledDate: '2026-10-08T09:00:00.000Z',
      companyId: 'acme',
      personId: 'jean',
      ownerId: null,
      responsibleUserId: null,
      backorderId: null,
      isLocked: true,
      printed: false,
    });
  });

  it('a receipt goes back to where it came from when the return type is not a receipt', () => {
    const receipt = { ...delivery, id: 'in1', name: 'WH/IN/00001', locationId: 'vendors', locationDestId: 'stock', pickingTypeId: 'typeIn' };
    const values = planReturnPicking({ id: 'ret2', name: 'WH/OUT/00009', origin: 'Return of WH/IN/00001', picking: receipt, pickingType: receiptType, types });
    expect([values.pickingTypeId, values.locationId, values.locationDestId]).toEqual(['typeOut', 'stock', 'vendors']);
  });

  it('a receipt type that is its own return type sends the return to its default destination', () => {
    const selfReturning: ReturnTypeInfo = { ...receiptType, id: 'typeSelf', returnPickingTypeId: 'typeSelf', defaultLocationDestId: 'input' };
    const receipt = { ...delivery, id: 'in2', name: 'WH/IN/00002', locationId: 'vendors', locationDestId: 'stock', pickingTypeId: 'typeSelf' };
    const values = planReturnPicking({
      id: 'ret3',
      name: 'WH/IN/00010',
      origin: 'Return of WH/IN/00002',
      picking: receipt,
      pickingType: selfReturning,
      types: new Map([...types, ['typeSelf', selfReturning]]),
    });
    expect([values.pickingTypeId, values.locationId, values.locationDestId]).toEqual(['typeSelf', 'stock', 'input']);
  });
});

const originalMove = {
  id: 'moveA',
  productId: 'productA',
  descriptionPickingManual: null,
  sequence: 10,
  origin: 'SO001',
  propagateCancel: true,
  restrictPartnerId: null,
  companyId: 'acme',
  personId: 'jean',
  packagingUomId: 'gram',
  additional: false,
  isInventory: false,
  inventoryName: null,
  productUomId: 'gram',
} as unknown as MoveRow;

describe('planReturnMove', () => {
  const picking = planReturnPicking({ id: 'ret1', name: 'WH/IN/00007', origin: 'Return of WH/OUT/00001', picking: delivery, pickingType: deliveryType, types });

  it('copies the returned move into the return, in the row unit, back to stock', () => {
    expect(
      planReturnMove({ id: 'new1', move: originalMove, quantity: 1000, uomId: 'gram', picking, pickingType: receiptType, now: '2026-10-08T10:00:00.000Z', isExchange: false }),
    ).toEqual({
      id: 'new1',
      productId: 'productA',
      descriptionPickingManual: null,
      sequence: 10,
      origin: 'SO001',
      propagateCancel: true,
      restrictPartnerId: null,
      packagingUomId: 'gram',
      additional: false,
      isInventory: false,
      inventoryName: null,
      companyId: 'acme',
      personId: 'jean',
      productUomQty: 1000,
      productUomId: 'gram',
      pickingId: 'ret1',
      state: 'DRAFT',
      date: '2026-10-08T10:00:00.000Z',
      locationId: 'customers',
      locationDestId: 'stock',
      locationFinalId: null,
      pickingTypeId: 'typeIn',
      warehouseId: 'wh',
      originReturnedMoveId: 'moveA',
      procureMethod: 'MAKE_TO_STOCK',
      priority: 'NORMAL',
    });
  });

  it('an outgoing return takes the contact of the return transfer; an exchange is not a return of the move', () => {
    const outgoing = { ...picking, pickingTypeCode: 'OUTGOING' as const, companyId: 'other', personId: null };
    const values = planReturnMove({ id: 'new2', move: originalMove, quantity: 2, uomId: 'gram', picking: outgoing, pickingType: deliveryType, now: 'now', isExchange: true });
    expect([values.companyId, values.personId, values.originReturnedMoveId]).toEqual(['other', null, null]);
  });

  it('the packaging is the return move unit, and a transfer without locations takes the move ones reversed', () => {
    const packed = { ...originalMove, packagingUomId: 'box', locationId: 'stock', locationDestId: 'customers' } as MoveRow;
    const values = planReturnMove({
      id: 'new3',
      move: packed,
      quantity: 3,
      uomId: 'gram',
      picking: { ...picking, locationId: null, locationDestId: null },
      pickingType: receiptType,
      now: 'now',
      isExchange: false,
    });
    expect([values.packagingUomId, values.locationId, values.locationDestId]).toEqual(['gram', 'customers', 'stock']);
  });
});

describe('planReturnMoveLinks', () => {
  // Pick (stock → output) then ship (output → customers); 3 shipped, the ship return went to stock.
  const graph = new Map<string, ReturnLinkMove>(
    [
      { id: 'pick', state: 'DONE', locationDestPath: 'wh/output/', originReturnedMoveId: null, moveOrigIds: [], moveDestIds: ['ship'] },
      { id: 'ship', state: 'DONE', locationDestPath: 'customers/', originReturnedMoveId: null, moveOrigIds: ['pick'], moveDestIds: [] },
      { id: 'shipReturn', state: 'DONE', locationDestPath: 'wh/stock/', originReturnedMoveId: 'ship', moveOrigIds: ['ship'], moveDestIds: [] },
    ].map((move) => [move.id, move as ReturnLinkMove]),
  );

  it('a return of the pick starts from its own move, not from the ship return that went elsewhere', () => {
    expect(planReturnMoveLinks({ moveId: 'pick', newMoveSourcePath: 'wh/output/', graph, isExchange: false })).toEqual({
      origIds: ['pick'],
      destIds: [],
    });
  });

  it('a return of a downstream move that came back into the new source is an origin too', () => {
    const intoOutput = new Map(graph);
    intoOutput.set('shipReturn', { ...(graph.get('shipReturn') as ReturnLinkMove), locationDestPath: 'wh/output/' });
    expect(planReturnMoveLinks({ moveId: 'pick', newMoveSourcePath: 'wh/output/', graph: intoOutput, isExchange: false }).origIds).toEqual([
      'shipReturn',
      'pick',
    ]);
  });

  it('a return of the ship feeds the return of the pick made later (returns of its origin moves)', () => {
    const withPickReturn = new Map(graph);
    withPickReturn.set('pickReturn', { id: 'pickReturn', state: 'ASSIGNED', locationDestPath: 'wh/stock/', originReturnedMoveId: 'pick', moveOrigIds: [], moveDestIds: [] });
    expect(planReturnMoveLinks({ moveId: 'ship', newMoveSourcePath: 'customers/', graph: withPickReturn, isExchange: false })).toEqual({
      origIds: ['ship'],
      destIds: ['pickReturn'],
    });
  });

  it('an exchange keeps the destination links and drops the origin links', () => {
    expect(planReturnMoveLinks({ moveId: 'pick', newMoveSourcePath: 'wh/output/', graph, isExchange: true }).origIds).toEqual([]);
  });
});
