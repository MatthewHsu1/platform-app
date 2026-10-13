import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { helpdeskSlaCategories, helpdeskSlaIgnoreStages, helpdeskSlaTags, helpdeskSlaTeams } from 'src/helpdesk-sla/sla-records';

// A deleted policy loses its four lists.
export const POLICY_DELETE_RULES: DeleteRules = {
  references: [],
  cascades: [],
  links: [
    { of: helpdeskSlaTeams, field: 'slaId' },
    { of: helpdeskSlaCategories, field: 'slaId' },
    { of: helpdeskSlaTags, field: 'slaId' },
    { of: helpdeskSlaIgnoreStages, field: 'slaId' },
  ],
};
