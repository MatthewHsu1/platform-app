import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// Columns the shipped lists cannot name or the hook-made lists never learned. The stage of an order is a staff
// list the install makes: a shipped view cannot name it (its field id differs per workspace), so the hook adds
// it to the orders table of a work case once the list exists. The case lists the hook made already show ten
// columns, so the new case fields join them as hidden columns staff can switch on.
export const HELPDESK_FIELDSERVICE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [],
  viewColumns: [
    { objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'Work case service orders', fieldNames: ['stage'], isVisible: true },
    ...['My cases', 'Unassigned', 'SLA expired'].map((viewName) => ({
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      viewName,
      fieldNames: ['fsmLocation', 'resolution'],
      isVisible: false,
    })),
  ],
};
