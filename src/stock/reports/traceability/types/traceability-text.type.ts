import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The translation extractor reads only front-component files, so the widget hands the report view its texts.
export type TraceabilityText = {
  unfoldFailed: MessageDescriptor;
  empty: MessageDescriptor;
  unfold: MessageDescriptor;
  fold: MessageDescriptor;
  reference: MessageDescriptor;
  product: MessageDescriptor;
  date: MessageDescriptor;
  lot: MessageDescriptor;
  from: MessageDescriptor;
  to: MessageDescriptor;
  quantity: MessageDescriptor;
  deliveries: MessageDescriptor;
  customers: MessageDescriptor;
};
