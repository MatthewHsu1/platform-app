import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockPackageTypeStockPutawayRuleRel',
    namePlural: 'stockPackageTypeStockPutawayRuleRels',
    labelSingular: 'Putaway package type link',
    labelPlural: 'Putaway package type links',
    description: 'Limits a putaway rule to a package type',
    sides: [
      {
        universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPutawayRule,
        name: 'stockPutawayRule',
        label: 'Putaway rule',
        icon: 'IconArrowBarToDown',
        targetObjectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.packageTypes,
      },
      {
        universalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPackageType,
        name: 'stockPackageType',
        label: 'Package Type',
        icon: 'IconBox',
        targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.putawayRules,
      },
    ],
  }),
);
