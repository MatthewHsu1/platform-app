import { type ValidationRuleSpec } from 'src/shared/install/install-spec.type';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Relation rules name the relation field, never the join column; a required check is an explicit isDefined(...)
// because a plain comparison does not refuse an empty value.
const requiredRelation = (
  objectUniversalIdentifier: string,
  ruleName: string,
  relation: string,
  relationName: string,
  label: string,
): ValidationRuleSpec => ({
  objectUniversalIdentifier,
  name: `platform-stock-${ruleName}-${relationName}-required`,
  expression: `isDefined(${relation})`,
  message: `${label} is required.`,
});

const requiredText = (
  objectUniversalIdentifier: string,
  ruleName: string,
  label: string,
  field = 'name',
  fieldName = 'name',
): ValidationRuleSpec => ({
  objectUniversalIdentifier,
  name: `platform-stock-${ruleName}-${fieldName}-required`,
  expression: `isNonEmptyString(${field})`,
  message: `${label} is required.`,
});

// A stock row's product must track inventory, but that check goes two relations deep, which validation rules
// refuse: the stock row trigger refuses it after the save instead.
export const STOCK_CORE_VALIDATION_RULES: ValidationRuleSpec[] = [
  {
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'platform-stock-location-inventory-frequency-positive',
    expression: 'not isDefined(cyclicInventoryFrequency) or cyclicInventoryFrequency >= 0',
    message: 'The inventory frequency (days) for a location must be non-negative.',
  },
  {
    objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'platform-stock-warehouse-code-length',
    expression: 'not isNonEmptyString(code) or length(code) <= 5',
    message: 'The short name of a warehouse has at most 5 characters.',
  },
  {
    objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'platform-stock-move-line-quantity-positive',
    expression: 'not isDefined(quantity) or quantity >= 0',
    message: 'You can not enter negative quantities.',
  },
  {
    objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'platform-stock-quant-location-not-view',
    expression: 'location.usage != "VIEW"',
    message: 'You cannot take products from or deliver products to a location of type "view".',
  },
  requiredRelation(STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER, 'picking', 'pickingType', 'picking-type', 'Operation type'),
  requiredRelation(STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER, 'move', 'product', 'product', 'Product'),
  requiredRelation(STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER, 'quant', 'product', 'product', 'Product'),
  requiredRelation(STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER, 'quant', 'location', 'location', 'Location'),
  requiredRelation(STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER, 'scrap', 'product', 'product', 'Product'),
  requiredText(STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER, 'location', 'Location name'),
  requiredText(STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER, 'warehouse', 'Warehouse'),
  requiredText(STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, 'picking-type', 'Operation type'),
  requiredText(STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, 'picking-type', 'Sequence prefix', 'sequenceCode', 'sequence-code'),
  requiredText(STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER, 'reference', 'Reference'),
  requiredText(STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'scrap-reason-tag', 'Name'),
];
