import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { PRODUCT_EXPIRY_SEED_KEY_FEFO } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import { REMOVAL_METHOD } from 'src/stock/routing-options.constant';
import { PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_CORE_VALIDATION_RULES } from 'src/stock/stock-core-validation-rules';
import { LOCATION_USAGE, ORDERPOINT_SEQUENCE_CODE, STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The first expiry, first out strategy, the serial number, package, reordering rule and scrap sequences, the
// seed locations and the validation rules of the Inventory module; the first warehouse is made by stock-post-install.
export const STOCK_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.3.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: PRODUCT_EXPIRY_SEED_KEY_FEFO,
          values: { name: 'First Expiry First Out (FEFO)', method: REMOVAL_METHOD.FEFO },
        },
      ],
    },
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: STOCK_SEED_KEYS.lotSequence,
          values: { name: 'Serial Numbers', code: 'stock.lot.serial', prefix: '', padding: 7, numberNext: 1, numberIncrement: 1, active: true },
        },
        {
          seedKey: STOCK_SEED_KEYS.packageSequence,
          values: { name: 'Packages', code: 'stock.package', prefix: 'PACK', padding: 7, numberNext: 1, numberIncrement: 1, active: true },
        },
        {
          seedKey: STOCK_SEED_KEYS.orderpointSequence,
          values: {
            name: 'Stock orderpoint',
            code: ORDERPOINT_SEQUENCE_CODE,
            prefix: 'OP/',
            padding: 5,
            numberNext: 1,
            numberIncrement: 1,
            active: true,
          },
        },
        {
          seedKey: STOCK_SEED_KEYS.scrapSequence,
          values: { name: 'Sequence scrap', code: 'stock.scrap', prefix: 'SP/', padding: 5, numberNext: 1, numberIncrement: 1, active: true },
        },
      ],
    },
    {
      objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        { seedKey: STOCK_SEED_KEYS.suppliers, values: { name: 'Vendors', usage: LOCATION_USAGE.SUPPLIER, active: true } },
        { seedKey: STOCK_SEED_KEYS.customers, values: { name: 'Customers', usage: LOCATION_USAGE.CUSTOMER, active: true } },
        { seedKey: STOCK_SEED_KEYS.transit, values: { name: 'Inter-warehouse transit', usage: LOCATION_USAGE.TRANSIT, active: false } },
        { seedKey: STOCK_SEED_KEYS.inventory, values: { name: 'Inventory adjustment', usage: LOCATION_USAGE.INVENTORY, active: true } },
        { seedKey: STOCK_SEED_KEYS.production, values: { name: 'Production', usage: LOCATION_USAGE.PRODUCTION, active: true } },
        { seedKey: STOCK_SEED_KEYS.scrap, values: { name: 'Scrap', usage: LOCATION_USAGE.INVENTORY, active: true } },
      ],
    },
  ],
  boards: [],
  validationRules: [
    ...STOCK_CORE_VALIDATION_RULES,
    {
      objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-stock-lot-product-required',
      expression: 'isDefined(product)',
      message: 'A lot/serial number needs a product.',
    },
    {
      objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-stock-orderpoint-product-required',
      expression: 'isDefined(product)',
      message: 'Product is required.',
    },
  ],
};
