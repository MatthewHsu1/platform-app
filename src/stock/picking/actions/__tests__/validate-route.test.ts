import { type RoutePayload } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { makeValidateRoute } from 'src/stock/picking/actions/validate-route';
import { StockUserError } from 'src/stock/stock-errors';
import { makeStockRouteHandler, readIds } from 'src/stock/stock-route';
import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';

const payload = (body: Record<string, unknown>) => ({ body }) as unknown as RoutePayload;

const route = (
  answer: (pickingIds: string[], options: ValidateOptions) => ValidateResult,
  expiredLotsToConfirm: (pickingIds: string[]) => Promise<string[] | null> = async () => null,
  { hookFails = false }: { hookFails?: boolean } = {},
) => {
  const calls: { pickingIds: string[]; options: ValidateOptions }[] = [];
  const hookCalls: { pickingIds: string[]; batchesToValidate: string[]; pickingsToDetach: string[] }[] = [];
  // Validate runs and the batch hook in the order they happened.
  const log: string[] = [];
  const handler = makeStockRouteHandler(async () => 'en')(
    makeValidateRoute({
      readPickingIds: async (body) => readIds(body, 'pickingIds'),
      validatePickings: async (pickingIds, options) => {
        calls.push({ pickingIds, options });
        log.push(`validate ${pickingIds.join(',')}`);
        return answer(pickingIds, options);
      },
      expiredLotsToConfirm,
      afterValidateBatch: async (args) => {
        hookCalls.push(args);
        log.push(`batch hook ${args.pickingIds.join(',')}`);
        if (hookFails) {
          throw new Error('timeout');
        }
      },
    }),
  );
  const post = async (body: Record<string, unknown>) => {
    const response = await handler(payload(body));
    return { status: response.status, body: JSON.parse(String(response.body)) as unknown };
  };

  return { calls, hookCalls, log, post };
};

describe('the Validate route', () => {
  it('validates the selection once when no answer is given yet', async () => {
    const { calls, post } = route((pickingIds) => ({ kind: 'needsAnswer', question: 'backorder', pickingIds }));

    expect(await post({ pickingIds: ['a', 'b'] })).toEqual({
      status: 200,
      body: { kind: 'needsAnswer', question: 'backorder', pickingIds: ['a', 'b'] },
    });
    expect(calls).toEqual([{ pickingIds: ['a', 'b'], options: { skipExpired: false, skipBatchHook: true } }]);
  });

  // Ticked transfers get a backorder, unticked ones none; the other selected transfers
  // were not asked and run as "create backorder".
  it('runs the ticked and the unticked transfers apart and merges what they return', async () => {
    const { calls, post } = route((pickingIds, options) =>
      options.cancelBackorder === true
        ? { kind: 'done', backorderIds: [], printouts: ['print-c'], showReceptionReport: ['c'] }
        : { kind: 'done', backorderIds: [`bo-${pickingIds[0]}`], printouts: ['print-a'] },
    );

    expect(
      await post({ pickingIds: ['a', 'b', 'c'], backorderAnswer: { createBackorderIds: ['a'], noBackorderIds: ['c', 'x'] } }),
    ).toEqual({
      status: 200,
      body: { kind: 'done', backorderIds: ['bo-a'], printouts: ['print-a', 'print-c'], showReceptionReport: ['c'] },
    });
    expect(calls).toEqual([
      { pickingIds: ['a', 'b'], options: { cancelBackorder: false, skipExpired: true, logEveryTransfer: false, skipBatchHook: true } },
      { pickingIds: ['c'], options: { cancelBackorder: true, skipExpired: true, logEveryTransfer: false, skipBatchHook: true } },
    ]);
  });

  it('asks for the less-quantities task on every transfer when the answer is the "No backorder" button', async () => {
    const { calls, post } = route(() => ({ kind: 'done', backorderIds: [], printouts: [] }));

    await post({ pickingIds: ['a', 'b'], backorderAnswer: { createBackorderIds: [], noBackorderIds: ['a'], noBackorderButton: true } });

    expect(calls).toEqual([
      { pickingIds: ['b'], options: { cancelBackorder: false, skipExpired: true, logEveryTransfer: true, skipBatchHook: true } },
      { pickingIds: ['a'], options: { cancelBackorder: true, skipExpired: true, logEveryTransfer: true, skipBatchHook: true } },
    ]);
  });

  // The expired-lot question covers the whole selection: no transfer is validated before it is answered.
  it('asks about expired lots before running either group of a backorder answer', async () => {
    const { calls, post } = route(
      () => ({ kind: 'done', backorderIds: [], printouts: [] }),
      async (pickingIds) => (pickingIds.includes('c') ? ['lot-c'] : null),
    );

    expect(
      await post({ pickingIds: ['a', 'b', 'c'], backorderAnswer: { createBackorderIds: ['a'], noBackorderIds: ['c'] } }),
    ).toEqual({
      status: 200,
      body: { kind: 'needsAnswer', question: 'expiredLots', pickingIds: ['a', 'b', 'c'], lotIds: ['lot-c'] },
    });
    expect(calls).toEqual([]);
  });

  // The batch rules look at the whole click: two transfers of one batch, one
  // answered with a backorder and one without, are both done before either is
  // judged, so neither leaves the batch for the other being still open.
  it('runs the batch hook once, after both answer groups, with every selected transfer', async () => {
    const { hookCalls, log, post } = route(() => ({ kind: 'done', backorderIds: [], printouts: [] }));

    await post({ pickingIds: ['p1', 'p2'], backorderAnswer: { createBackorderIds: ['p1'], noBackorderIds: ['p2'] } });

    expect(log).toEqual(['validate p1', 'validate p2', 'batch hook p1,p2']);
    expect(hookCalls).toEqual([{ pickingIds: ['p1', 'p2'], batchesToValidate: [], pickingsToDetach: [] }]);
  });

  it('runs the batch hook for the group that was done when the other group was refused, and answers the refusal', async () => {
    const { log, post } = route((_pickingIds, options) =>
      options.cancelBackorder === true
        ? { kind: 'refused', reason: 'This record is being processed. Try again in a moment.' }
        : { kind: 'done', backorderIds: [], printouts: [] },
    );

    expect(await post({ pickingIds: ['p1', 'p2'], backorderAnswer: { createBackorderIds: ['p1'], noBackorderIds: ['p2'] } })).toEqual({
      status: 409,
      body: { error: 'This record is being processed. Try again in a moment.' },
    });
    expect(log).toEqual(['validate p1', 'validate p2', 'batch hook p1,p2']);
  });

  it('answers the refusal of a group, not the failure of the batch hook after it', async () => {
    const { post } = route(
      (_pickingIds, options) =>
        options.cancelBackorder === true
          ? { kind: 'refused', reason: "You can't validate an empty transfer. Please add some products to move before proceeding." }
          : { kind: 'done', backorderIds: [], printouts: [] },
      undefined,
      { hookFails: true },
    );

    expect(await post({ pickingIds: ['p1', 'p2'], backorderAnswer: { createBackorderIds: ['p1'], noBackorderIds: ['p2'] } })).toEqual({
      status: 409,
      body: { error: "You can't validate an empty transfer. Please add some products to move before proceeding." },
    });
  });

  it('answers "being processed, try again" when only the batch hook fails, so a retry finishes it', async () => {
    const { post } = route(() => ({ kind: 'done', backorderIds: [], printouts: [] }), undefined, { hookFails: true });

    expect(await post({ pickingIds: ['p1'], backorderAnswer: { createBackorderIds: [], noBackorderIds: ['p1'] } })).toEqual({
      status: 409,
      body: { error: 'This record is being processed. Try again in a moment.' },
    });
  });

  it('runs no batch hook when every group was refused, as nothing moved', async () => {
    const { log, post } = route(() => ({ kind: 'refused', reason: 'This record is being processed. Try again in a moment.' }));

    await post({ pickingIds: ['p1'], backorderAnswer: { createBackorderIds: ['p1'], noBackorderIds: [] } });

    expect(log).toEqual(['validate p1']);
  });

  it('leaves the reception report out when no receipt names one', async () => {
    const { post } = route(() => ({ kind: 'done', backorderIds: [], printouts: [] }));

    expect(await post({ pickingIds: ['a'], backorderAnswer: { createBackorderIds: [], noBackorderIds: ['a'] }, skipExpired: true })).toEqual({
      status: 200,
      body: { kind: 'done', backorderIds: [], printouts: [] },
    });
  });

  it('answers 409 with the reason when a transfer is being processed', async () => {
    const { post } = route(() => ({ kind: 'refused', reason: 'This record is being processed. Try again in a moment.' }));

    expect(await post({ pickingIds: ['a'] })).toEqual({
      status: 409,
      body: { error: 'This record is being processed. Try again in a moment.' },
    });
  });

  it('answers 409 when a check before the run refuses', async () => {
    const { post } = route(() => {
      throw new StockUserError("You can't validate an empty transfer. Please add some products to move before proceeding.");
    });

    expect(await post({ pickingIds: ['a'] })).toEqual({
      status: 409,
      body: { error: "You can't validate an empty transfer. Please add some products to move before proceeding." },
    });
  });
});
