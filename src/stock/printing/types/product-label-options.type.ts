import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { type ZplTemplate } from 'src/stock/printing/types/zpl-template.type';

export type ProductLabelOptions = {
  format?: ProductLabelFormat;
  copies?: number;
  moveQuantity?: 'MOVE' | 'CUSTOM';
  zplTemplate?: ZplTemplate;
  pricelistId?: string;
  extraContent?: string;
};
