import { defineField } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten, numberField } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(
    numberField(FIELD_IDS.productTemplateVirtualAvailable, 'virtualAvailable', 'Forecasted quantity', 'IconChartLine'),
  ),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
