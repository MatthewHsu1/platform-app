import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.workspaceMemberResponsibleProductTemplates,
    name: 'responsibleProductTemplates',
    label: 'Products as stock responsible',
    icon: 'IconPackage',
    targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.productTemplateResponsible,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
