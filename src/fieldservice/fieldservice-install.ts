import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { FIELDSERVICE_SEED_KEYS, ORDER_SEQUENCE_CODE, ORDER_STAGE, ORDER_STAGE_OPTIONS, OTHER_OPTION } from 'src/fieldservice/fieldservice-options.constant';
import {
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

const categories = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  name: 'categories',
  label: 'Categories',
  icon: 'IconCategory',
  type: 'MULTI_SELECT' as const,
  options: OTHER_OPTION,
});

// The order stage list (New, Completed, Cancelled; staff add their own), the tag and category lists, the order
// number series (FO001) and the Default Team, made once when the module first arrives. Names have no required
// rule: Twenty saves a new row before its name is typed, so such a rule refuses every new row.
export const FIELDSERVICE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [
    {
      objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      type: 'SELECT',
      defaultValue: `'${ORDER_STAGE.NEW}'`,
      options: ORDER_STAGE_OPTIONS,
    },
    {
      objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTag',
      type: 'MULTI_SELECT',
      options: OTHER_OPTION,
    },
    categories(FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER),
    categories(FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER),
    categories(FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER),
  ],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: FIELDSERVICE_SEED_KEYS.sequence,
          values: { name: 'Service order number', code: ORDER_SEQUENCE_CODE, prefix: 'FO', padding: 3, numberNext: 1, numberIncrement: 1, active: true },
        },
      ],
    },
    {
      objectUniversalIdentifier: FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [{ seedKey: FIELDSERVICE_SEED_KEYS.defaultTeam, values: { name: 'Default Team', sequence: 1, active: true } }],
    },
  ],
  boards: [],
  validationRules: [],
};
