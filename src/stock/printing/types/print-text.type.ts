import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The translation extractor reads only front-component files, so each Print button hands its text to the shared pop-up.
export type PrintText = {
  printing: MessageDescriptor;
  failed: MessageDescriptor;
  ready: MessageDescriptor;
  open: MessageDescriptor;
  selectAll: MessageDescriptor;
  close: MessageDescriptor;
};
