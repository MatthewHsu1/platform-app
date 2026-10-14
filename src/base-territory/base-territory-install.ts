import { RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base-territory/base-territory-universal-identifiers.constant';
import { TERRITORY_TYPE_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// The kind of a territory is a staff list. No service area rows are made: staff build their own tree.
export const BASE_TERRITORY_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [
    {
      objectUniversalIdentifier: RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'territoryType',
      label: 'Type',
      icon: 'IconCategory',
      type: 'SELECT',
      options: TERRITORY_TYPE_OPTIONS,
    },
  ],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [],
};
