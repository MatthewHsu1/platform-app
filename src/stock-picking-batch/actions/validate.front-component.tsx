import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds } from 'twenty-sdk/front-component';

import {
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { ValidateFlow } from 'src/stock/picking/actions/validate-flow';
import { type ValidateText } from 'src/stock/picking/types/validate-text.type';

const TEXT: ValidateText = {
  validated: msg('Batch transfer validated.'),
  validatedWithBackorders: msg('Validated. Backorders created: {count}.'),
  failed: msg('Could not validate the batch.'),
  discardFailed: msg('Could not remove the expired lines.'),
  emptySelection: msg('Select all is not supported here. Tick the records you want instead.'),
  validating: msg('Validating…'),
  close: msg('Close'),
  expiredTitle: msg('Confirmation'),
  expiredOneLot: msg('You are going to deliver the product {productName}, {lotName} which is expired or should at least be removed from stock.'),
  expiredLots: msg('You are going to deliver some product expired lots.'),
  expiredProceed: msg('Do you confirm you want to proceed?'),
  confirm: msg('Confirm'),
  discardExpired: msg('Discard expired'),
  cancel: msg('Cancel'),
  backorderTitle: msg('Create backorder?'),
  backorderExplanation: msg('You have processed less products than the initial demand.'),
  backorderHelp: msg(
    'Create a backorder if you expect to process the remaining products later. Do not create a backorder if you will not process the remaining products.',
  ),
  createBackorder: msg('Create Backorder'),
  noBackorder: msg('No Backorder'),
  discard: msg('Discard'),
};

// The batch counts as one transfer: its questions answer for all its transfers.
const ValidateBatch = () => {
  const batchIds = useSelectedRecordIds();

  return (
    <ValidateFlow
      routePath={STOCK_PICKING_BATCH_ROUTE_PATHS.validate}
      body={batchIds.length === 0 ? null : { batchIds }}
      showTransfers={false}
      text={TEXT}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.validate,
  name: 'stock-picking-batch-validate',
  description: 'Validates a batch and asks the backorder or expired-lot question once for the whole batch.',
  component: ValidateBatch,
});
