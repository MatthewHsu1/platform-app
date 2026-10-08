import {
  ATTRIBUTE_SELECTION,
  ATTRIBUTE_VALUE_SELECTION,
  attributeLines,
  COMBINATION_SELECTION,
  EXCLUSION_LINK_SELECTION,
  EXCLUSION_SELECTION,
  exclusions,
  LINE_SELECTION,
  LINE_VALUE_LINK_SELECTION,
  lineValueLinks,
  productProducts,
  productTemplates,
  TEMPLATE_ATTRIBUTE_VALUE_SELECTION,
  TEMPLATE_SELECTION,
  templateAttributeValues,
  VARIANT_SELECTION,
} from 'src/product/variant/product-records';
import {
  type AttributeRow,
  type AttributeValueRow,
  type CombinationRow,
  type ExclusionLinkRow,
  type ExclusionRow,
  type LineRow,
  type LineValueLinkRow,
  type TemplateAttributeValueRecord,
  type TemplateRow,
  type TemplateState,
  type VariantRow,
} from 'src/product/variant/template-state.type';
import { findMany, includingDeleted } from 'src/shared/triggers/records';

type Nested<TRecord> = { edges: { node: TRecord }[] } | null;

type LineResult = LineRow & { attribute: AttributeRow | null };
type TemplateAttributeValueResult = TemplateAttributeValueRecord & {
  productAttributeValue: AttributeValueRow | null;
};
type ExclusionResult = ExclusionRow & { values: Nested<ExclusionLinkRow> };
type VariantResult = VariantRow & { productTemplateAttributeValues: Nested<CombinationRow> };

const nodes = <TRecord>(connection: Nested<TRecord>) =>
  connection === null ? [] : connection.edges.map((edge) => edge.node);

const VALUE_WITH_ATTRIBUTE_VALUE = `${TEMPLATE_ATTRIBUTE_VALUE_SELECTION} productAttributeValue { ${ATTRIBUTE_VALUE_SELECTION} }`;

const withoutNested = <TRecord extends object, TKey extends keyof TRecord>(
  record: TRecord,
  key: TKey,
): Omit<TRecord, TKey> => {
  const rest: Partial<TRecord> = { ...record };
  delete rest[key];
  return rest as Omit<TRecord, TKey>;
};

// One request for everything one product's variant rules read (a second one
// only when an exclusion names another product's values).
export const readTemplateState = async (templateId: string): Promise<TemplateState | null> => {
  const found = await findMany<{
    template: TemplateRow[];
    lines: LineResult[];
    links: LineValueLinkRow[];
    values: TemplateAttributeValueResult[];
    exclusionRows: ExclusionResult[];
    variants: VariantResult[];
  }>({
    template: { of: productTemplates, filter: { id: { eq: templateId } }, selection: TEMPLATE_SELECTION },
    lines: {
      of: attributeLines,
      filter: { productTmplId: { eq: templateId } },
      selection: `${LINE_SELECTION} attribute { ${ATTRIBUTE_SELECTION} }`,
    },
    links: {
      of: lineValueLinks,
      filter: { productTemplateAttributeLine: { productTmplId: { eq: templateId } } },
      selection: LINE_VALUE_LINK_SELECTION,
    },
    values: {
      of: templateAttributeValues,
      filter: includingDeleted({ productTmplId: { eq: templateId } }),
      selection: VALUE_WITH_ATTRIBUTE_VALUE,
    },
    exclusionRows: {
      of: exclusions,
      filter: { productTmplId: { eq: templateId } },
      selection: `${EXCLUSION_SELECTION} values { edges { node { ${EXCLUSION_LINK_SELECTION} } } }`,
    },
    variants: {
      of: productProducts,
      filter: includingDeleted({ productTmplId: { eq: templateId } }),
      selection: `${VARIANT_SELECTION} productTemplateAttributeValues { edges { node { ${COMBINATION_SELECTION} } } }`,
    },
  });
  const [template] = found.template;

  if (template === undefined) {
    return null;
  }

  const exclusionLinkRows = found.exclusionRows.flatMap((exclusion) => nodes(exclusion.values));
  const ownValueIds = new Set(found.values.map((record) => record.id));
  const otherIds = [
    ...new Set(
      [
        ...found.exclusionRows.map((exclusion) => exclusion.productTemplateAttributeValueId),
        ...exclusionLinkRows.map((link) => link.productTemplateAttributeValueId),
      ].flatMap((id) => (id === null || ownValueIds.has(id) ? [] : [id])),
    ),
  ];
  const otherValues =
    otherIds.length === 0
      ? []
      : await templateAttributeValues.find<TemplateAttributeValueResult>(
          includingDeleted({ id: { in: otherIds } }),
          VALUE_WITH_ATTRIBUTE_VALUE,
        );
  const attributeValues = [...found.values, ...otherValues].flatMap((record) =>
    record.productAttributeValue === null ? [] : [record.productAttributeValue],
  );
  const attributes = found.lines.flatMap((line) => (line.attribute === null ? [] : [line.attribute]));

  return {
    template,
    lines: found.lines.map((line) => withoutNested(line, 'attribute')),
    lineValueLinks: found.links,
    attributes: new Map(attributes.map((attribute) => [attribute.id, attribute])),
    attributeValues: new Map(attributeValues.map((value) => [value.id, value])),
    templateAttributeValues: found.values.map((record) => withoutNested(record, 'productAttributeValue')),
    otherTemplateAttributeValues: otherValues.map((record) =>
      withoutNested(record, 'productAttributeValue'),
    ),
    exclusions: found.exclusionRows.map((exclusion) => withoutNested(exclusion, 'values')),
    exclusionLinks: exclusionLinkRows,
    variants: found.variants.map((variant) => withoutNested(variant, 'productTemplateAttributeValues')),
    combinations: found.variants.flatMap((variant) => nodes(variant.productTemplateAttributeValues)),
  };
};
