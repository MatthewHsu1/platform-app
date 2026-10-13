import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { ValidateFlow } from 'src/stock/picking/actions/validate-flow';
import { type ValidateText } from 'src/stock/picking/types/validate-text.type';
import { type PrintLinkNames } from 'src/stock/printing/types/print-link-names.type';
import {
  VALIDATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  VALIDATE_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

// The prints an operation type can make at Validate, named as their print buttons name them.
export const VALIDATE_PRINT_NAMES: PrintLinkNames = {
  deliverySlip: msg('Delivery Slip'),
  returnSlip: msg('Return Slip'),
  receptionReport: msg('Reception Report'),
  receptionReportLabels: msg('Reception Report Label'),
  productLabels: msg('Product Labels'),
  lotLabelPdf: msg('Lot/Serial Number (PDF)'),
  lotLabelZpl: msg('Lot/Serial Number (ZPL)'),
  pickingPackages: msg('Packages'),
};

const TEXT: ValidateText = {
  validated: msg('Validated.'),
  validatedWithBackorders: msg('Validated. Backorders created: {count}.'),
  failed: msg('Could not validate the transfer.'),
  discardFailed: msg('Could not remove the expired lines.'),
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
  printoutsTitle: msg('Printouts'),
  printNames: VALIDATE_PRINT_NAMES,
};

const ValidatePickings = () => {
  const pickingIds = useSelectedRecordIds();

  return <ValidateFlow routePath={VALIDATE_ROUTE_PATH} body={pickingIds.length === 0 ? null : { pickingIds }} showTransfers text={TEXT} />;
};

export default defineFrontComponent({
  universalIdentifier: VALIDATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'validate-pickings',
  description: 'Validates the selected transfers and asks about backorders when some quantities are short.',
  component: ValidatePickings,
});
