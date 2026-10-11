import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PrintLinkNames } from 'src/stock/printing/types/print-link-names.type';

// The translation extractor reads only front-component files, so each Put in Pack button hands its text to the shared pop-up.
export type PutInPackText = {
  failed: MessageDescriptor;
  packed: MessageDescriptor;
  choicesUnread: MessageDescriptor;
  selectAll: MessageDescriptor;
  close: MessageDescriptor;
  destinationTitle: MessageDescriptor;
  destinationExplanation: MessageDescriptor;
  destinationLabel: MessageDescriptor;
  confirm: MessageDescriptor;
  discard: MessageDescriptor;
  packageTitle: MessageDescriptor;
  packageTypeLabel: MessageDescriptor;
  noPackageType: MessageDescriptor;
  packageLabel: MessageDescriptor;
  newPackage: MessageDescriptor;
  packing: MessageDescriptor;
  // The package label the operation type prints at Put in Pack.
  printoutsTitle: MessageDescriptor;
  printNames: PrintLinkNames;
};
