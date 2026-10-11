import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { type ZplTemplate } from 'src/stock/printing/types/zpl-template.type';

// The translation extractor reads only front-component files, so the product label pop-up gets its texts from one.
export type LabelsLayoutText = {
  title: MessageDescriptor;
  quantityToPrint: MessageDescriptor;
  operationQuantities: MessageDescriptor;
  custom: MessageDescriptor;
  copies: MessageDescriptor;
  format: MessageDescriptor;
  formats: Record<ProductLabelFormat, MessageDescriptor>;
  pricelist: MessageDescriptor;
  extraContent: MessageDescriptor;
  zplTemplate: MessageDescriptor;
  zplTemplates: Record<ZplTemplate, MessageDescriptor>;
  print: MessageDescriptor;
  discard: MessageDescriptor;
  sheetPrint: PrintText;
  zplPrint: PrintText;
};
