import { FIELDSERVICE_STOCK_SEED_KEYS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The virtual location "Field", a parent for stock held away from the warehouses, made once when the module first
// arrives.
export const FIELDSERVICE_STOCK_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [{ seedKey: FIELDSERVICE_STOCK_SEED_KEYS.fieldLocation, values: { name: 'Field', usage: LOCATION_USAGE.VIEW, active: true } }],
    },
  ],
  boards: [],
  validationRules: [],
};
