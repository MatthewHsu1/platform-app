import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PrintText } from 'src/stock/printing/types/print-text.type';

// The translation extractor reads only front-component files, so the lot label pop-up gets its texts from one.
export type LotLabelsLayoutText = {
  title: MessageDescriptor;
  quantityToPrint: MessageDescriptor;
  perLot: MessageDescriptor;
  perUnit: MessageDescriptor;
  unitHelp: MessageDescriptor;
  format: MessageDescriptor;
  sheet: MessageDescriptor;
  zpl: MessageDescriptor;
  print: MessageDescriptor;
  discard: MessageDescriptor;
  sheetPrint: PrintText;
  zplPrint: PrintText;
};
