import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The translation extractor reads only front-component files, so each scrap pop-up hands its text to the shared panel.
// `body` has {location}, {quantity}, {unit} and {product} placeholders.
export type InsufficientQuantityText = {
  title: MessageDescriptor;
  body: MessageDescriptor;
  currentStock: MessageDescriptor;
  confirm: MessageDescriptor;
  discard: MessageDescriptor;
};
