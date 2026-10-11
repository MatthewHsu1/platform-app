import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { printTimeZoneOf } from 'src/stock/printing/utils/print-dates.util';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds } from 'src/stock/stock-route';
import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';

type DoneResult = Extract<ValidateResult, { kind: 'done' }>;

// The body of the Validate route. With an answer to the backorder question, the transfers answered
// "no backorder" run with cancelBackorder true and every other selected transfer as answered
// "create backorder": the option holds one answer per call. A refusal is a 409; its reason is
// English text already filled in, so the route's translation finds no catalog entry for it. The
// prints are made once for the whole click, over every transfer it made done.
export const makeValidateRoute =
  (deps: {
    readPickingIds: (body: Record<string, unknown>) => Promise<string[]>;
    validatePickings: (pickingIds: string[], options: ValidateOptions) => Promise<ValidateResult>;
    expiredLotsToConfirm: (pickingIds: string[]) => Promise<string[] | null>;
    afterValidateBatch: (args: { pickingIds: string[]; batchesToValidate: string[]; pickingsToDetach: string[] }) => Promise<void>;
    autoprint: (pickingIds: string[], timeZone: string) => Promise<PrintLink[]>;
    receptionReportToShow: (pickingIds: string[]) => Promise<string[]>;
  }) =>
  async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const pickingIds = await deps.readPickingIds(body);
    const skipExpired = body.skipExpired === true;
    const printTimeZone = printTimeZoneOf(body.timeZone);
    const answer =
      typeof body.backorderAnswer === 'object' && body.backorderAnswer !== null ? (body.backorderAnswer as Record<string, unknown>) : null;
    const results: ValidateResult[] = [];

    if (answer === null) {
      results.push(await deps.validatePickings(pickingIds, { skipExpired, skipBatchHook: true, skipPrints: true }));
    } else {
      // The groups run one after the other, so the expired-lot question is asked once for the whole selection
      // first: otherwise one group could be done before another asks it.
      if (!skipExpired) {
        const lotIds = await deps.expiredLotsToConfirm(pickingIds);

        if (lotIds !== null) {
          return { kind: 'needsAnswer', question: 'expiredLots', pickingIds, lotIds };
        }
      }
      const noBackorderIds = readIds(answer, 'noBackorderIds').filter((id) => pickingIds.includes(id));
      const withBackorderIds = pickingIds.filter((id) => !noBackorderIds.includes(id));
      const logEveryTransfer = answer.noBackorderButton === true;

      if (withBackorderIds.length > 0) {
        results.push(await deps.validatePickings(withBackorderIds, { cancelBackorder: false, skipExpired: true, logEveryTransfer, skipBatchHook: true, skipPrints: true }));
      }
      if (noBackorderIds.length > 0) {
        results.push(await deps.validatePickings(noBackorderIds, { cancelBackorder: true, skipExpired: true, logEveryTransfer, skipBatchHook: true, skipPrints: true }));
      }
    }

    // The batch rules judge the whole click once, after every group ran: the transfers that ended done
    // are told apart there. A question stops the click before any group ran, and a click where every
    // group was refused moved nothing. A group's refusal is the answer even when the batch rules then
    // fail; when only they fail, the stock has moved and a retry finishes them.
    const refusal = results.find((result) => result.kind === 'refused');
    let hookFailed = false;

    if (results.some((result) => result.kind === 'done') && !results.some((result) => result.kind === 'needsAnswer')) {
      try {
        await deps.afterValidateBatch({ pickingIds, batchesToValidate: [], pickingsToDetach: [] });
      } catch {
        hookFailed = true;
      }
    }
    if (refusal !== undefined) {
      throw new StockUserError(refusal.reason);
    }
    if (hookFailed) {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    const question = results.find((result) => result.kind === 'needsAnswer');

    if (question !== undefined) {
      return question;
    }

    const done = results.filter((result): result is DoneResult => result.kind === 'done');
    const doneIds = done.flatMap((result) => result.doneIds);
    const printouts = await deps.autoprint(doneIds, printTimeZone);
    const showReceptionReport = await deps.receptionReportToShow(doneIds);
    const merged: DoneResult = { kind: 'done', backorderIds: done.flatMap((result) => result.backorderIds), doneIds, printouts };

    return showReceptionReport.length > 0 ? { ...merged, showReceptionReport } : merged;
  };
