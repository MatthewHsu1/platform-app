import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.productTemplateResponsible,
    name: 'responsible',
    label: 'Responsible',
    icon: 'IconUserCircle',
    targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
    targetFieldUniversalIdentifier: FIELD_IDS.workspaceMemberResponsibleProductTemplates,
    onDelete: OnDeleteAction.SET_NULL,
  }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
