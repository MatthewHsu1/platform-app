import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import { COMPLETE_ORDER_ROUTE_PATH, FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// The answers of the field service buttons and the notes the field service rules write. The translation extractor
// reads only front-component files, so they are listed here to reach the catalog; each must match its source text
// exactly (src/fieldservice/fieldservice-messages.constant.ts, actions/fieldservice-action-messages.constant.ts).
export const FIELDSERVICE_RULE_TEXTS = [
  msg('Only the Complete button moves a service order to Completed.'),
  msg('{date} is a holiday: {name}.'),
  msg('Create a field service team first.'),
  msg('You cannot delete this order: only an order in the New stage can be deleted.'),
  msg('Cannot move to stage {stage} until the {field} field is set.'),
  msg('These fields cannot be checked and were left out: {fields}.'),
  msg('A location cannot be its own parent.'),
  msg('Equipment cannot be its own parent.'),
  msg('The warranty end must not be before the warranty start.'),
  msg('This location is used by service orders.'),
  msg('This team is used by service orders.'),
  msg('A field service team with this name already exists.'),
  msg('Equipment with this name already exists.'),
  msg('Select one record.'),
  msg('Service order not found.'),
  msg('This order is already closed.'),
  msg('You need the Field service level User or higher.'),
  msg('You need the Field service level Dispatcher or higher.'),
  msg('Only a completed order can be signed.'),
  msg('Type the name of the person who signs.'),
  msg('Order signed'),
  msg('Order signed by {name}'),
  msg('Contact or company not found.'),
  msg('A service location for this contact or company already exists.'),
  msg('A field service worker for this contact already exists.'),
  msg('Opportunity not found.'),
  msg('Service orders are made from opportunities, not from leads.'),
  msg('Set the service location of the opportunity first.'),
];

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.completeFrontComponent,
  name: 'complete-service-order',
  description: 'Completes the open service order.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: COMPLETE_ORDER_ROUTE_PATH,
    successMessage: msg('Order completed.'),
    fallbackError: msg('Could not complete the order.'),
  }),
});
