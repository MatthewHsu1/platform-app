import { defineLogicFunction } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readText } from 'src/shared/utils/read-text.util';
import { addToWave } from 'src/stock-picking-batch/add-to-wave';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { filterReadableIds } from 'src/stock/stock-access';
import { readCurrentMemberId } from 'src/stock/stock-current-member';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  const lineIds = readIds(body, 'lineIds');

  if (lineIds.length === 0) {
    throw new StockUserError(BATCH_MESSAGES.noWaveLines);
  }
  // The clicking user must be able to read every line they chose.
  if ((await filterReadableIds('stockMoveLine', 'stockMoveLines', lineIds)).length !== lineIds.length) {
    throw new StockUserError(BATCH_MESSAGES.lineNotFound);
  }
  const mode = body.mode === 'NEW' ? 'NEW' : 'EXISTING';
  const waveId = mode === 'NEW' ? null : readText(body.waveId);

  if (mode === 'EXISTING' && waveId === null) {
    throw new StockUserError(BATCH_MESSAGES.chooseWave);
  }
  // The responsible is only for a new wave.
  const result = await addToWave({
    lineIds,
    waveId,
    responsibleId: mode === 'NEW' ? readText(body.responsibleId) : null,
    actingMemberId: await readCurrentMemberId(),
  });

  if (result.kind === 'held') {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }
  const title = translate(await readUserLocale(), result.created ? BATCH_MESSAGES.waveCreated : BATCH_MESSAGES.waveUpdated);

  return { message: `${title}: ${result.waveName}` };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.addToWave,
  name: 'stock-picking-batch-add-to-wave',
  description:
    'Puts the chosen move lines in a new or an open wave transfer, splitting their transfers when only part of them goes in.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.addToWave, httpMethod: 'POST', isAuthRequired: true },
});
