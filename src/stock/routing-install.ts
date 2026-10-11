import { type ModuleInstallSpec, type ValidationRuleSpec } from 'src/shared/install/install-spec.type';
import { REMOVAL_SEED_ROWS } from 'src/stock/removal/removal-seed-rows';
import { MTO_ROUTE_SEED_KEY } from 'src/stock/routing-options.constant';
import {
  PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

const rule = (objectUniversalIdentifier: string, name: string, expression: string, message: string): ValidationRuleSpec => ({
  objectUniversalIdentifier,
  name,
  expression,
  message,
});

// Relation rules name the relation field; a required check is an explicit
// isDefined(...), and an empty size or max weight is allowed.
const ROUTING_VALIDATION_RULES: ValidationRuleSpec[] = [
  rule(STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-stock-route-name-required', 'isNonEmptyString(name)', 'Route is required.'),
  rule(STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-stock-rule-name-required', 'isNonEmptyString(name)', 'Name is required.'),
  rule(
    STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-rule-destination-required',
    'isDefined(locationDest)',
    'Destination Location is required.',
  ),
  rule(STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-stock-rule-route-required', 'isDefined(route)', 'Route is required.'),
  rule(
    STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-rule-operation-type-required',
    'isDefined(pickingType)',
    'Operation Type is required.',
  ),
  rule(
    STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-putaway-rule-arrival-required',
    'isDefined(locationIn)',
    'When product arrives in is required.',
  ),
  rule(
    STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-putaway-rule-store-to-required',
    'isDefined(locationOut)',
    'Store to sublocation is required.',
  ),
  rule(
    STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-storage-category-name-required',
    'isNonEmptyString(name)',
    'Storage Category is required.',
  ),
  rule(
    STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-storage-category-max-weight',
    'not isDefined(maxWeight) or maxWeight >= 0',
    'Max weight should be a positive number.',
  ),
  rule(
    STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-capacity-category-required',
    'isDefined(storageCategory)',
    'Storage Category is required.',
  ),
  rule(
    STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-capacity-quantity-positive',
    'quantity > 0',
    'Quantity should be a positive number.',
  ),
  rule(PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-product-removal-name-required', 'isNonEmptyString(name)', 'Name is required.'),
  rule(PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-product-removal-method-required', 'isDefined(method)', 'Method is required.'),
  rule(
    STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-package-type-height',
    'not isDefined(height) or height >= 0',
    'Height must be positive',
  ),
  rule(STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, 'platform-stock-package-type-width', 'not isDefined(width) or width >= 0', 'Width must be positive'),
  rule(
    STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-package-type-length',
    'not isDefined(packagingLength) or packagingLength >= 0',
    'Length must be positive',
  ),
  rule(
    STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-package-type-max-weight',
    'not isDefined(maxWeight) or maxWeight >= 0',
    'Max Weight must be positive',
  ),
  rule(
    STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    'platform-stock-package-type-name-required',
    'isNonEmptyString(name)',
    'A package type needs a name.',
  ),
];

// Registered before the stock install: the removal strategies and the
// make-to-order route exist before the first warehouse asks for them.
export const ROUTING_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.3.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    { objectUniversalIdentifier: PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER, rows: REMOVAL_SEED_ROWS },
    {
      objectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: MTO_ROUTE_SEED_KEY,
          values: { name: 'Replenish on Order (MTO)', active: false, sequence: 5, productSelectable: true, productCategSelectable: true },
        },
      ],
    },
  ],
  boards: [],
  validationRules: ROUTING_VALIDATION_RULES,
};
