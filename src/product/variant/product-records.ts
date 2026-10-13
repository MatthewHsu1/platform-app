import { records } from 'src/shared/triggers/records';

export const productTemplates = records('productTemplate', 'productTemplates');
export const productProducts = records('productProduct', 'productProducts');
export const productAttributes = records('productAttribute', 'productAttributes');
export const productAttributeValues = records('productAttributeValue', 'productAttributeValues');
export const attributeLines = records('productTemplateAttributeLine', 'productTemplateAttributeLines');
export const lineValueLinks = records('productAttributeValueLineRel', 'productAttributeValueLineRels');
export const templateAttributeValues = records(
  'productTemplateAttributeValue',
  'productTemplateAttributeValues',
);
export const exclusions = records(
  'productTemplateAttributeExclusion',
  'productTemplateAttributeExclusions',
);
export const exclusionLinks = records(
  'productAttrExclusionValueIdsRel',
  'productAttrExclusionValueIdsRels',
);
export const variantCombinationLinks = records(
  'productVariantCombination',
  'productVariantCombinations',
);
export const packagingBarcodes = records('productUom', 'productUoms');
export const uoms = records('uomUom', 'uomUoms');

const CURRENCY = 'amountMicros currencyCode';

export const TEMPLATE_SELECTION = `id name active updatedAt updatedBy { source } defaultCode barcode weight volume standardPrice { ${CURRENCY} } listPrice { ${CURRENCY} }`;
export const VARIANT_SELECTION = `id name active updatedAt updatedBy { source } defaultCode barcode weight volume combinationIndices createdAt deletedAt standardPrice { ${CURRENCY} } priceExtra { ${CURRENCY} } lstPrice { ${CURRENCY} }`;
export const ATTRIBUTE_SELECTION = 'id name sequence createVariant';
export const ATTRIBUTE_VALUE_SELECTION = `id name sequence defaultExtraPrice { ${CURRENCY} }`;
export const LINE_SELECTION = 'id name active sequence valueCount productTmplId attributeId';
export const LINE_VALUE_LINK_SELECTION = 'id productTemplateAttributeLineId productAttributeValueId';
export const TEMPLATE_ATTRIBUTE_VALUE_SELECTION = `id name ptavActive productAttributeValueId attributeLineId productTmplId deletedAt priceExtra { ${CURRENCY} }`;
export const EXCLUSION_SELECTION = 'id name productTemplateAttributeValueId productTmplId';
export const EXCLUSION_LINK_SELECTION =
  'id productTemplateAttributeExclusionId productTemplateAttributeValueId';
export const COMBINATION_SELECTION = 'id productProductId productTemplateAttributeValueId';
