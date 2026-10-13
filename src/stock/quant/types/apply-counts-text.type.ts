import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type CountRowsText } from 'src/stock/quant/types/count-rows-text.type';

// The translation extractor reads only front-component files, so each apply button hands its text to the shared pop-up.
export type ApplyCountsText = {
  rows: CountRowsText;
  adjustmentTitle: MessageDescriptor;
  adjustmentReason: MessageDescriptor;
  apply: MessageDescriptor;
  conflictTitle: MessageDescriptor;
  conflictBody: MessageDescriptor;
  keepCounted: MessageDescriptor;
  keepDifference: MessageDescriptor;
  discard: MessageDescriptor;
  working: MessageDescriptor;
  close: MessageDescriptor;
  applied: MessageDescriptor;
  failed: MessageDescriptor;
};
