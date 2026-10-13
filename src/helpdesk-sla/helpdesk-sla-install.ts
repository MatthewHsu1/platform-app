import { HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// A policy needs its days and hours, which start at 0. Its name has no required rule: Twenty saves a new row
// before its name is typed, so such a rule refuses every new policy.
export const HELPDESK_SLA_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.5.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-helpdesk-sla-days-hours-required',
      expression: 'isDefined(days) and isDefined(hours)',
      message: 'Days and hours are required.',
    },
  ],
};
