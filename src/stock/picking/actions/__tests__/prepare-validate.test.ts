import { describe, expect, it } from 'vitest';

import { makePrepareValidate } from 'src/stock/picking/actions/prepare-validate';
import { EMPTY_TRANSFER_MESSAGE, EMPTY_TRANSFERS_MESSAGE, ROUNDING_MESSAGE } from 'src/stock/utils/plan-validate-checks.util';
import { type TrackingStage } from 'src/stock/lot/types/tracking-stage.type';
import { type PrepareValidateDeps } from 'src/stock/picking/types/prepare-validate-deps.type';
import { type PrepareValidateMove } from 'src/stock/picking/types/prepare-validate-move.type';
import { type PrepareValidatePicking } from 'src/stock/picking/types/prepare-validate-picking.type';

const move = (overrides: Partial<PrepareValidateMove> = {}): PrepareValidateMove => ({
  id: 'm1',
  state: 'ASSIGNED',
  quantity: 2,
  productUomQty: 2,
  picked: false,
  isScrap: false,
  productName: 'Belt',
  uomName: 'Units',
  lines: [{ id: 'l1', quantity: 2, picked: false, quantityInMoveUnit: 2 }],
  ...overrides,
});

const picking = (overrides: Partial<PrepareValidatePicking> = {}): PrepareValidatePicking => ({
  id: 'p1',
  name: 'WH/OUT/00001',
  state: 'ASSIGNED',
  createBackorder: 'ASK',
  moves: [move()],
  lineCount: 1,
  ...overrides,
});

const fakeDeps = (
  initial: PrepareValidatePicking[],
  expiredLotIds: string[] | null = null,
  tracking: Partial<Record<TrackingStage, string[]>> = {},
  wholeBatch = false,
) => {
  let pickings = initial;
  const calls = { confirmed: [] as string[], setQuantity: [] as [string, number][], marked: [] as string[] };
  const deps: PrepareValidateDeps = {
    readPickings: async (ids) => pickings.filter((row) => ids.includes(row.id)),
    confirmPickings: async (ids) => {
      calls.confirmed.push(...ids);
      pickings = pickings.map((row) =>
        ids.includes(row.id) ? { ...row, state: 'CONFIRMED', moves: row.moves.map((item) => ({ ...item, state: 'CONFIRMED' })) } : row,
      );
    },
    setMoveQuantity: async (moveId, quantity) => {
      calls.setQuantity.push([moveId, quantity]);
      pickings = pickings.map((row) => ({
        ...row,
        moves: row.moves.map((item) =>
          item.id === moveId
            ? { ...item, quantity, lines: [{ id: `${moveId}-line`, quantity, picked: false, quantityInMoveUnit: quantity }] }
            : item,
        ),
      }));
    },
    markPicked: async (moveIds) => {
      calls.marked.push(...moveIds);
    },
    trackingRefusals: async (_ids, options) => (options?.stage === undefined ? [] : (tracking[options.stage] ?? [])),
    expiredLotsToConfirm: async () => expiredLotIds,
    isWholeBatch: async () => wholeBatch,
    digits: () => 2,
  };

  return { deps, calls };
};

describe('prepareValidate', () => {
  it('confirms a draft transfer and sets the demand as quantity on its empty moves', async () => {
    const { deps, calls } = fakeDeps([picking({ state: 'DRAFT', moves: [move({ state: 'DRAFT', quantity: 0, lines: [] })], lineCount: 0 })]);

    const result = await makePrepareValidate(deps)(['p1'], {});

    expect(calls.confirmed).toEqual(['p1']);
    expect(calls.setQuantity).toEqual([['m1', 2]]);
    expect(result).toEqual({ kind: 'ready', pickingIds: ['p1'], noBackorderIds: [], askedIds: [] });
  });

  it('refuses an empty transfer before writing anything', async () => {
    const { deps, calls } = fakeDeps([picking({ moves: [], lineCount: 0 })]);

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({ kind: 'refused', reason: EMPTY_TRANSFER_MESSAGE });
    expect(calls.marked).toEqual([]);
  });

  it('marks the moves picked, then asks the backorder question for 1 of 2 processed', async () => {
    const { deps, calls } = fakeDeps([
      picking({ moves: [move({ quantity: 1, lines: [{ id: 'l1', quantity: 1, picked: false, quantityInMoveUnit: 1 }] })] }),
    ]);

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({
      kind: 'needsAnswer',
      question: 'backorder',
      pickingIds: ['p1'],
      showTransfers: false,
    });
    expect(calls.marked).toEqual(['m1']);
  });

  describe('several transfers', () => {
    const short = (id: string) =>
      picking({
        id,
        name: `WH/OUT/${id}`,
        moves: [move({ id: `m-${id}`, quantity: 1, lines: [{ id: `l-${id}`, quantity: 1, picked: false, quantityInMoveUnit: 1 }] })],
      });

    it('lists the transfers in the backorder question', async () => {
      const { deps } = fakeDeps([short('p1'), short('p2')]);

      expect(await makePrepareValidate(deps)(['p1', 'p2'], {})).toEqual({
        kind: 'needsAnswer',
        question: 'backorder',
        pickingIds: ['p1', 'p2'],
        showTransfers: true,
      });
    });

    it('asks about all the transfers of one batch as one, without the list', async () => {
      const { deps } = fakeDeps([short('p1'), short('p2')], null, {}, true);

      expect(await makePrepareValidate(deps)(['p1', 'p2'], {})).toEqual({
        kind: 'needsAnswer',
        question: 'backorder',
        pickingIds: ['p1', 'p2'],
        showTransfers: false,
      });
    });

    it('names the empty transfers among several', async () => {
      const { deps } = fakeDeps([short('p1'), picking({ id: 'p2', name: 'WH/OUT/p2', moves: [], lineCount: 0 })]);

      expect(await makePrepareValidate(deps)(['p1', 'p2'], {})).toEqual({
        kind: 'refused',
        reason: EMPTY_TRANSFERS_MESSAGE.replace('{names}', 'WH/OUT/p2'),
      });
    });

    it('refuses the transfers of one batch with the single-transfer wording when one is empty', async () => {
      const { deps } = fakeDeps([short('p1'), picking({ id: 'p2', name: 'WH/OUT/p2', moves: [], lineCount: 0 })], null, {}, true);

      expect(await makePrepareValidate(deps)(['p1', 'p2'], {})).toEqual({ kind: 'refused', reason: EMPTY_TRANSFER_MESSAGE });
    });
  });

  it('takes the answer "no backorder" and returns the transfers asked about', async () => {
    const { deps } = fakeDeps([picking({ moves: [move({ picked: true }), move({ id: 'm2', quantity: 0, lines: [] })] })]);

    expect(await makePrepareValidate(deps)(['p1'], { cancelBackorder: true })).toEqual({
      kind: 'ready',
      pickingIds: ['p1'],
      noBackorderIds: ['p1'],
      askedIds: ['p1'],
    });
  });

  it('never asks for a NEVER type and gives it no backorder', async () => {
    const { deps } = fakeDeps([
      picking({ createBackorder: 'NEVER', moves: [move({ quantity: 1, lines: [{ id: 'l1', quantity: 1, picked: false, quantityInMoveUnit: 1 }] })] }),
    ]);

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({
      kind: 'ready',
      pickingIds: ['p1'],
      noBackorderIds: ['p1'],
      askedIds: [],
    });
  });

  it('asks about expired lots after the backorder answer, unless told to skip', async () => {
    const { deps } = fakeDeps(
      [picking({ moves: [move({ picked: true, lines: [{ id: 'l1', quantity: 2, picked: true, quantityInMoveUnit: 2 }] })] })],
      ['lot-1'],
    );

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({
      kind: 'needsAnswer',
      question: 'expiredLots',
      pickingIds: ['p1'],
      lotIds: ['lot-1'],
    });
    expect((await makePrepareValidate(deps)(['p1'], { skipExpired: true })).kind).toBe('ready');
  });

  it('asks about a line past its removal date even when its lot is not made yet', async () => {
    const { deps } = fakeDeps(
      [
        picking({
          moves: [move({ quantity: 1, productUomQty: 1, picked: true, lines: [{ id: 'l1', quantity: 1, picked: true, quantityInMoveUnit: 1 }] })],
        }),
      ],
      [],
    );

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({
      kind: 'needsAnswer',
      question: 'expiredLots',
      pickingIds: ['p1'],
      lotIds: [],
    });
  });

  describe('refusal order', () => {
    const roundingPicking = () =>
      picking({ moves: [move({ quantity: 2.005, lines: [{ id: 'l1', quantity: 2.005, picked: false, quantityInMoveUnit: 2.005 }] })] });
    const rounding = ROUNDING_MESSAGE.replace('{product}', 'Belt').replace('{unit}', 'Units');

    it('refuses a line rounding error before the lot checks of the lines it commits', async () => {
      const { deps } = fakeDeps([roundingPicking()], null, { lines: ['lot missing on a line'] });

      expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({ kind: 'refused', reason: rounding });
    });

    it('refuses a lot missing on a picked line before a line rounding error', async () => {
      const { deps } = fakeDeps([roundingPicking()], null, { transfers: ['lot missing on a picked line'] });

      expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({ kind: 'refused', reason: 'lot missing on a picked line' });
    });

    it('refuses with the lot check of the lines when nothing else applies', async () => {
      const { deps } = fakeDeps([picking()], null, { lines: ['lot missing on a line'] });

      expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({ kind: 'refused', reason: 'lot missing on a line' });
    });
  });

  it('drops a transfer that is already done', async () => {
    const { deps } = fakeDeps([picking({ state: 'DONE' })]);

    expect(await makePrepareValidate(deps)(['p1'], {})).toEqual({ kind: 'ready', pickingIds: [], noBackorderIds: [], askedIds: [] });
  });
});
