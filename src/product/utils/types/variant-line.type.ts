import { type CreateVariantMode } from 'src/product/utils/types/create-variant-mode.type';

export type VariantLine = {
  id: string;
  sequence: number;
  createVariant: CreateVariantMode;
  templateAttributeValueIds: string[];
  inactiveTemplateAttributeValueIds: string[];
};
