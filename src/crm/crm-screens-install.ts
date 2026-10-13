import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { PIPELINE_CARD_FIELDS } from 'src/crm/lead/crm-lead-views.constant';
import { CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// The board of the signed-in salesperson's own leads is made by the install,
// not the manifest: a board grouped by the Stage relation cannot be declared,
// and the stage board sync draws its columns like the Pipeline's. Stages and
// teams list in their own order.
export const CRM_SCREENS_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.4.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  validationRules: [],
  boards: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'My pipeline',
      icon: 'IconLayoutKanban',
      groupByFieldName: 'stage',
      hideWhere: { fieldName: 'wonStatus', values: [WON_STATUS.LOST] },
      aggregate: { operation: 'SUM', fieldName: 'expectedRevenue' },
      filters: [{ fieldName: 'salesperson', operand: 'IS', value: 'CURRENT_MEMBER' }],
      cardFields: PIPELINE_CARD_FIELDS,
    },
  ],
  viewSorts: [
    {
      objectUniversalIdentifier: CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      viewName: 'All',
      sorts: [
        { fieldName: 'sequence', direction: 'ASC' },
        { fieldName: 'name', direction: 'ASC' },
      ],
    },
    {
      objectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      viewName: 'All',
      sorts: [
        { fieldName: 'sequence', direction: 'ASC' },
        { fieldName: 'createdAt', direction: 'DESC' },
      ],
    },
  ],
};
