import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PrintLinkNames } from 'src/stock/printing/types/print-link-names.type';

// The translation extractor reads only front-component files, so each Validate button hands its text to the shared pop-up.
export type ValidateText = {
  validated: MessageDescriptor;
  validatedWithBackorders: MessageDescriptor;
  failed: MessageDescriptor;
  discardFailed: MessageDescriptor;
  emptySelection: MessageDescriptor;
  validating: MessageDescriptor;
  close: MessageDescriptor;
  expiredTitle: MessageDescriptor;
  expiredOneLot: MessageDescriptor;
  expiredLots: MessageDescriptor;
  expiredProceed: MessageDescriptor;
  confirm: MessageDescriptor;
  discardExpired: MessageDescriptor;
  cancel: MessageDescriptor;
  backorderTitle: MessageDescriptor;
  backorderExplanation: MessageDescriptor;
  backorderHelp: MessageDescriptor;
  createBackorder: MessageDescriptor;
  noBackorder: MessageDescriptor;
  discard: MessageDescriptor;
  // The prints the operation types make at Validate.
  printoutsTitle: MessageDescriptor;
  printNames: PrintLinkNames;
};
