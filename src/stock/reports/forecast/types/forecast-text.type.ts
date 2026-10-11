import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The translation extractor reads only front-component files, so the widget hands the report view its texts.
export type ForecastText = {
  warehouse: MessageDescriptor;
  onHand: MessageDescriptor;
  toRemove: MessageDescriptor;
  incoming: MessageDescriptor;
  outgoing: MessageDescriptor;
  forecasted: MessageDescriptor;
  free: MessageDescriptor;
  timeToReplenish: MessageDescriptor;
  days: MessageDescriptor;
  today: MessageDescriptor;
  earliestArrival: MessageDescriptor;
  available: MessageDescriptor;
  usedBy: MessageDescriptor;
  deliveryDate: MessageDescriptor;
  expectedOn: MessageDescriptor;
  stockInTransit: MessageDescriptor;
  freeStockInTransit: MessageDescriptor;
  stockToReserve: MessageDescriptor;
  expiredStock: MessageDescriptor;
  freeStock: MessageDescriptor;
  notAvailable: MessageDescriptor;
  toRemoveNow: MessageDescriptor;
  toRemoveOn: MessageDescriptor;
  reserve: MessageDescriptor;
  reserveQuantity: MessageDescriptor;
  unreserve: MessageDescriptor;
  forecastedInventory: MessageDescriptor;
  incomingDraft: MessageDescriptor;
  outgoingDraft: MessageDescriptor;
  forecastedWithPending: MessageDescriptor;
  graphEmpty: MessageDescriptor;
  truncated: MessageDescriptor;
};
