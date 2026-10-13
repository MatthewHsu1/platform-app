import { type TemplateRow } from 'src/product/variant/types/template-row.type';
import { type LineRow } from 'src/product/variant/types/line-row.type';
import { type LineValueLinkRow } from 'src/product/variant/types/line-value-link-row.type';
import { type AttributeRow } from 'src/product/variant/types/attribute-row.type';
import { type AttributeValueRow } from 'src/product/variant/types/attribute-value-row.type';
import { type TemplateAttributeValueRecord } from 'src/product/variant/types/template-attribute-value-record.type';
import { type ExclusionRow } from 'src/product/variant/types/exclusion-row.type';
import { type ExclusionLinkRow } from 'src/product/variant/types/exclusion-link-row.type';
import { type VariantRow } from 'src/product/variant/types/variant-row.type';
import { type CombinationRow } from 'src/product/variant/types/combination-row.type';

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
