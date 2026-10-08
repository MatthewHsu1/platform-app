import { defineObject, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { booleanField, numberField, oneToManyField } from 'src/shared/fields';

// Twenty has no exchange rates, so the currency is a
// plain code and the price code refuses to mix currencies. The name is
// Twenty's own name field.
export default defineObject({
  universalIdentifier: PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productPricelist',
  namePlural: 'productPricelists',
  labelSingular: 'Pricelist',
  labelPlural: 'Pricelists',
  description: 'A set of price rules a customer can be given',
  icon: 'IconListDetails',
  fields: [
    booleanField(FIELD_IDS.active, 'active', 'Active', 'IconCircleCheck', true),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 16,
    }),
    {
      universalIdentifier: FIELD_IDS.currencyCode,
      name: 'currencyCode',
      label: 'Currency',
      icon: 'IconCoin',
      type: FieldType.TEXT,
      defaultValue: `'${DEFAULT_CURRENCY_CODE}'`,
    },
    oneToManyField({
      universalIdentifier: FIELD_IDS.items,
      name: 'items',
      label: 'Rules',
      icon: 'IconListCheck',
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.pricelist,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.basedOnRules,
      name: 'basedOnRules',
      label: 'Rules based on this pricelist',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.basePricelist,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.companies,
      name: 'companies',
      label: 'Companies',
      icon: 'IconBuildingSkyscraper',
      targetObjectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.companyPropertyProductPricelist,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.people,
      name: 'people',
      label: 'People',
      icon: 'IconUsers',
      targetObjectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.personPropertyProductPricelist,
    }),
  ],
});
