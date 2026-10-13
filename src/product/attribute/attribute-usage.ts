import { attributeInUse, classifyValueUsage } from 'src/product/utils/guards.util';
import {
  attributeLines,
  lineValueLinks,
  productProducts,
  productTemplates,
  templateAttributeValues,
  variantCombinationLinks,
} from 'src/product/variant/product-records';

type LineRow = { active: boolean; productTmplId: string | null };

const withProductActive = async (lines: LineRow[]) => {
  const templateIds = [...new Set(lines.flatMap(({ productTmplId }) => (productTmplId === null ? [] : [productTmplId])))];
  const activeTemplates =
    templateIds.length === 0
      ? []
      : await productTemplates.find<{ id: string }>({ id: { in: templateIds }, active: { eq: true } }, 'id');
  const activeIds = new Set(activeTemplates.map(({ id }) => id));

  return lines.map((line) => ({
    lineActive: line.active,
    productActive: line.productTmplId !== null && activeIds.has(line.productTmplId),
  }));
};

// Active attribute lines on active products.
export const isAttributeUsed = async (attributeId: string) => {
  const lines = await attributeLines.find<LineRow>(
    { attributeId: { eq: attributeId }, active: { eq: true } },
    'active productTmplId',
  );

  return attributeInUse(await withProductActive(lines));
};

// Any attribute line not in the trash, archived or on an archived product.
export const attributeHasLines = async (attributeId: string) =>
  (await attributeLines.find<{ id: string }>({ attributeId: { eq: attributeId } }, 'id')).length > 0;

// The value's lines and every variant, archived too,
// that holds the value through a product attribute value.
export const readValueUsage = async (valueId: string) => {
  const links = await lineValueLinks.find<{ productTemplateAttributeLineId: string | null }>(
    { productAttributeValueId: { eq: valueId } },
    'productTemplateAttributeLineId',
  );
  const lineIds = links.flatMap(({ productTemplateAttributeLineId }) =>
    productTemplateAttributeLineId === null ? [] : [productTemplateAttributeLineId],
  );
  const lines =
    lineIds.length === 0
      ? []
      : await attributeLines.find<LineRow>({ id: { in: lineIds } }, 'active productTmplId');
  const templateValues = await templateAttributeValues.find<{ id: string }>(
    { productAttributeValueId: { eq: valueId } },
    'id',
  );
  const combinations =
    templateValues.length === 0
      ? []
      : await variantCombinationLinks.find<{ productProductId: string | null }>(
          { productTemplateAttributeValueId: { in: templateValues.map(({ id }) => id) } },
          'productProductId',
        );
  const variantIds = [
    ...new Set(combinations.flatMap(({ productProductId }) => (productProductId === null ? [] : [productProductId]))),
  ];
  const variants =
    variantIds.length === 0
      ? []
      : await productProducts.find<{ active: boolean }>({ id: { in: variantIds } }, 'active');

  return classifyValueUsage({
    lines: await withProductActive(lines),
    variantActiveFlags: variants.map(({ active }) => active),
  });
};
