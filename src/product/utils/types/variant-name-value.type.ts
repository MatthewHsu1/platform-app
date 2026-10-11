import { type CreateVariantMode } from 'src/product/utils/types/create-variant-mode.type';

export type VariantNameValue = {
  name: string;
  isActive: boolean;
  lineId: string;
  lineSequence: number;
  attributeSequence: number;
  attributeId: string;
  valueSequence: number;
  lineCreateVariant: CreateVariantMode;
  lineActiveValueCount: number;
  lineTotalValueCount: number;
};
