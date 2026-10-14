import { ORDER_STAGE_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';
import { FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// The stage list of a rule starts as a copy of the order's stage list (New, Completed, Cancelled); staff add the
// stages they add to the order.
export const FIELDSERVICE_STAGE_VALIDATION_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [
    {
      objectUniversalIdentifier: FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      type: 'SELECT',
      options: ORDER_STAGE_OPTIONS,
    },
  ],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [],
};
