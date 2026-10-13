import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { settleLineEventDates } from 'src/product-expiry/settle-move-line-dates';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleMoveLineTrackingRefusals } from 'src/stock/lot/rules/move-line-tracking-refusals';
import { handleDoneLineEdits } from 'src/stock/move-line/rules/done-line-edits';
import { handleEntirePackBookkeeping } from 'src/stock/move-line/rules/entire-pack-bookkeeping';
import { handleMoveLineCreates } from 'src/stock/move-line/rules/move-line-creates';
import { handleMoveLineDeletes } from 'src/stock/move-line/rules/move-line-deletes';
import { handleOpenLineEdits } from 'src/stock/move-line/rules/open-line-edits';
import { handleShippingWeightDependencies } from 'src/stock/move-line/rules/shipping-weight-dependencies';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { STOCK_MOVE_LINE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<MoveLineEventRecord>>) => {
  const { operation, events } = readEvents<MoveLineEventRecord>(payload);
  const errors = errorCollector();

  // A refused lot or serial quantity is undone first, so no other rule acts on it.
  const refused = await handleMoveLineTrackingRefusals(events, operation, errors);
  const kept = events.filter((event) => !refused.has(event));

  // The done-line rule acts on lines that were done and never throws; the open-line rule acts on the others.
  await handleMoveLineCreates(kept, operation, errors);
  await handleDoneLineEdits(kept, operation, errors);
  await handleOpenLineEdits(kept, operation, errors);
  await handleMoveLineDeletes(kept, operation, errors);
  // Last, so the dates come from the line as the rules above left it.
  await errors.run('expiry dates', () => settleLineEventDates(operation, kept));
  // After the rules above, so it judges the lines as they now stand.
  await handleEntirePackBookkeeping(kept, operation, errors);
  // Last, so the weight counts the lines and packages as the rules above left them.
  await handleShippingWeightDependencies(kept, operation, errors);
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_MOVE_LINE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-move-line',
  description:
    'Refuses a lot of another product and a serial quantity other than 0 or 1, links a line a user adds to its move and posts it when its move is done, keeps reservations right when an open line changes, corrects stock when a done line changes, puts back deletes of done lines, dates a line from its lot, product and transfer, clears "entire package" on lines whose package no longer moves whole, frees destination containers no open line goes into, and weighs the transfer again.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMoveLine.*', batchMode: true },
});
