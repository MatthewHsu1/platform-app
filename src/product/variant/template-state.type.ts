import { type CreateVariantMode } from 'src/product/utils/plan-variants.util';

// Who saved a row last and when; T3 lets the later staff save win.
export type LastSave = {
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};

export type Currency = { amountMicros: number | null; currencyCode: string | null };

export type TemplateRow = LastSave & {
  id: string;
  name: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: Currency | null;
  weight: number | null;
  volume: number | null;
  listPrice: Currency | null;
};

export type AttributeRow = {
  id: string;
  name: string | null;
  sequence: number | null;
  createVariant: CreateVariantMode;
};

export type AttributeValueRow = {
  id: string;
  name: string | null;
  sequence: number | null;
  defaultExtraPrice: Currency | null;
};

export type LineRow = {
  id: string;
  name: string | null;
  active: boolean;
  sequence: number | null;
  valueCount: number | null;
  productTmplId: string | null;
  attributeId: string | null;
};

export type LineValueLinkRow = {
  id: string;
  productTemplateAttributeLineId: string | null;
  productAttributeValueId: string | null;
};

export type TemplateAttributeValueRecord = {
  id: string;
  name: string | null;
  ptavActive: boolean;
  productAttributeValueId: string | null;
  attributeLineId: string | null;
  productTmplId: string | null;
  priceExtra: Currency | null;
  deletedAt: string | null;
};

export type ExclusionRow = {
  id: string;
  name: string | null;
  productTemplateAttributeValueId: string | null;
  productTmplId: string | null;
};

export type ExclusionLinkRow = {
  id: string;
  productTemplateAttributeExclusionId: string | null;
  productTemplateAttributeValueId: string | null;
};

export type VariantRow = LastSave & {
  id: string;
  name: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: Currency | null;
  weight: number | null;
  volume: number | null;
  priceExtra: Currency | null;
  lstPrice: Currency | null;
  combinationIndices: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type CombinationRow = {
  id: string;
  productProductId: string | null;
  productTemplateAttributeValueId: string | null;
};

// Everything one product's variant rules read. Product attribute values and
// variants include soft-deleted rows, so a value or variant that comes back
// is restored instead of made again (the unique indexes count deleted rows).
export type TemplateState = {
  template: TemplateRow;
  lines: LineRow[];
  lineValueLinks: LineValueLinkRow[];
  attributes: Map<string, AttributeRow>;
  attributeValues: Map<string, AttributeValueRow>;
  templateAttributeValues: TemplateAttributeValueRecord[];
  // Values of other products that this product's exclusions name.
  otherTemplateAttributeValues: TemplateAttributeValueRecord[];
  exclusions: ExclusionRow[];
  exclusionLinks: ExclusionLinkRow[];
  variants: VariantRow[];
  combinations: CombinationRow[];
};
