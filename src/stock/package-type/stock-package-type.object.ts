import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import {
  appWritten,
  manyToOneField,
  numberField,
  oneToManyField,
  printoutsField,
  selectField,
  textField,
} from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

// `referenceSequence` is the package naming sequence; `sequence` is taken by the sort order.
export default defineObject({
  universalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockPackageType',
  namePlural: 'stockPackageTypes',
  labelSingular: 'Package type',
  labelPlural: 'Package types',
  description: 'A kind of box, pallet or tote: size, weight and routes',
  icon: 'IconPackage',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Package Type', icon: 'IconAbc', type: FieldType.TEXT },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 1 }),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.referenceSequence,
        name: 'referenceSequence',
        label: 'Reference Sequence',
        icon: 'IconListNumbers',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: FOREIGN_IDS.irSequencePackageTypes,
      }),
    ),
    textField(FIELD_IDS.sequenceCode, 'sequenceCode', 'Sequence Prefix', 'IconPrompt'),
    numberField(FIELD_IDS.height, 'height', 'Height', 'IconArrowsVertical', { decimals: 2, defaultValue: 0 }),
    numberField(FIELD_IDS.width, 'width', 'Width', 'IconArrowsHorizontal', { decimals: 2, defaultValue: 0 }),
    numberField(FIELD_IDS.packagingLength, 'packagingLength', 'Length', 'IconRuler', { decimals: 2, defaultValue: 0 }),
    numberField(FIELD_IDS.baseWeight, 'baseWeight', 'Weight', 'IconWeight', { decimals: 2, defaultValue: 0 }),
    numberField(FIELD_IDS.maxWeight, 'maxWeight', 'Max Weight', 'IconWeight', { decimals: 2, defaultValue: 0 }),
    textField(FIELD_IDS.barcode, 'barcode', 'Barcode', 'IconBarcode'),
    selectField(FIELD_IDS.packageUse, 'packageUse', 'Package Use', 'IconRecycle', 'DISPOSABLE', [
      { value: 'DISPOSABLE', label: 'Disposable Box', color: 'gray' },
      { value: 'REUSABLE', label: 'Reusable Box (totes)', color: 'green' },
    ]),
    printoutsField(FIELD_IDS.printouts),
    oneToManyField({
      universalIdentifier: FIELD_IDS.uoms,
      name: 'uoms',
      label: 'Packagings',
      icon: 'IconRuler',
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.uomUomPackageType,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.storageCategoryCapacities,
      name: 'storageCategoryCapacities',
      label: 'Storage capacities',
      icon: 'IconStack2',
      targetObjectUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.packageType,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.routes,
      name: 'routes',
      label: 'Routes',
      icon: 'IconRoute',
      targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPackageType,
      junctionTargetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockRoute,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.putawayRules,
      name: 'putawayRules',
      label: 'Putaway rules',
      icon: 'IconArrowBarToDown',
      targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPackageType,
    }),
  ],
});
