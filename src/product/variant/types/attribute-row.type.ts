import { type CreateVariantMode } from 'src/product/utils/types/create-variant-mode.type';

export type AttributeRow = {
  id: string;
  name: string | null;
  sequence: number | null;
  createVariant: CreateVariantMode;
};
