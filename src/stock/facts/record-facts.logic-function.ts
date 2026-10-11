import { defineLogicFunction } from 'twenty-sdk/define';

import { readRecordFacts } from 'src/stock/facts/read-record-facts';
import { RECORD_FACTS_ROUTE_PATH, RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(readRecordFacts);

export default defineLogicFunction({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-record-facts',
  description: 'Values the record pages work out when they open: transfer warnings, next serial, package content, duplicated serials.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: RECORD_FACTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
