import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { isOrderClosed } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';
import { planCloseOffer } from 'src/helpdesk-fieldservice/utils/plan-close-offer.util';
import { records } from 'src/shared/triggers/records';
import { twentyMetadata, requireData } from 'src/shared/twenty-graphql';

const cases = records('helpdeskTicket', 'helpdeskTickets');

// After an order is completed: the id of the Close work case panel when the order's case can now be closed, else
// null. All reads are the app's ('application' access: the app role reads every row, so a row rule cannot hide an
// open order). The panel is a front component, which a command opens by its database id; the app finds the id
// through the metadata API, which lists only the app's own front components.
export const readCloseCasePanel = async (orderId: string): Promise<string | null> => {
  const [order] = await fsmOrders.find<{ closedStatus: string | null; ticketId: string | null; resolution: { markdown: string | null } | null }>(
    { id: { eq: orderId } },
    'closedStatus ticketId resolution { markdown }',
  );

  if (order === undefined || order.ticketId === null) {
    return null;
  }
  const [workCase] = await cases.find<{ stage: { closed: boolean | null } | null }>({ id: { eq: order.ticketId } }, 'stage { closed }');
  const orders = await fsmOrders.find<{ closedStatus: string | null }>({ ticketId: { eq: order.ticketId } }, 'closedStatus');
  const offer = planCloseOffer({
    orderClosed: isOrderClosed(order.closedStatus),
    orderResolution: order.resolution?.markdown ?? null,
    workCase: workCase === undefined ? null : { stageClosed: workCase.stage?.closed === true, orderClosedStatuses: orders.map((row) => row.closedStatus) },
  });

  if (offer.kind === 'refuse') {
    return null;
  }
  const found = requireData(
    await twentyMetadata<{ frontComponents: { id: string; universalIdentifier: string | null }[] }>(
      'application',
      '{ frontComponents { id universalIdentifier } }',
    ),
    'Find the Close work case panel',
  ).frontComponents;

  return found.find((component) => component.universalIdentifier === HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.closeCaseFrontComponent)?.id ?? null;
};
