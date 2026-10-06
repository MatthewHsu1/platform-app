import { STAGE_FIELD_NAME, WON_STAGE_VALUE, WON_STATUS } from 'src/crm/crm-options.constant';
import {
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// Stage defaults from the reference ERP crm/data/crm_stage_data.xml, lost reasons from
// crm_lost_reason_data.xml. the reference ships no default tags, but Twenty refuses a
// SELECT or MULTI_SELECT with no options, so Tags starts with one.
export const CRM_INSTALL: ModuleInstallSpec = {
  staffLists: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: STAGE_FIELD_NAME,
      label: 'Stage',
      icon: 'IconProgress',
      type: 'SELECT',
      defaultValue: "'NEW'",
      options: [
        { value: 'NEW', label: 'New', color: 'gray', position: 0 },
        { value: 'QUALIFIED', label: 'Qualified', color: 'blue', position: 1 },
        { value: 'PROPOSITION', label: 'Proposition', color: 'purple', position: 2 },
        { value: WON_STAGE_VALUE, label: 'Won', color: 'green', position: 3 },
      ],
    },
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTag',
      type: 'MULTI_SELECT',
      options: [{ value: 'OTHER', label: 'Other', color: 'gray', position: 0 }],
    },
  ],
  defaultRows: [
    {
      objectUniversalIdentifier: CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
      names: ['Too expensive', "We don't have people/skills", 'Not enough stock'],
    },
  ],
  boards: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Pipeline',
      icon: 'IconLayoutKanban',
      groupByFieldName: STAGE_FIELD_NAME,
      hideWhere: { fieldName: 'wonStatus', values: [WON_STATUS.LOST] },
    },
  ],
};
