import { CASE_DELETE_RULES } from 'src/helpdesk/delete-rules/case-delete-rules';
import { CATEGORY_DELETE_RULES } from 'src/helpdesk/delete-rules/category-delete-rules';
import { STAGE_DELETE_RULES } from 'src/helpdesk/delete-rules/stage-delete-rules';
import { TAG_DELETE_RULES } from 'src/helpdesk/delete-rules/tag-delete-rules';
import { TEAM_DELETE_RULES } from 'src/helpdesk/delete-rules/team-delete-rules';
import {
  helpdeskSlaCategories,
  helpdeskSlaIgnoreStages,
  helpdeskSlas,
  helpdeskSlaTags,
  helpdeskSlaTeams,
  helpdeskTicketSlas,
} from 'src/helpdesk-sla/sla-records';

// Service level rows go to the trash with their case and come back with it. A deleted team, category, tag or
// stage loses its policy links, and a deleted stage leaves the policies and rows that aimed at it.
CASE_DELETE_RULES.cascades.push({ of: helpdeskTicketSlas, field: 'ticketId' });
TEAM_DELETE_RULES.links.push({ of: helpdeskSlaTeams, field: 'teamId' });
CATEGORY_DELETE_RULES.links.push({ of: helpdeskSlaCategories, field: 'categoryId' });
TAG_DELETE_RULES.links.push({ of: helpdeskSlaTags, field: 'tagId' });
STAGE_DELETE_RULES.links.push({ of: helpdeskSlaIgnoreStages, field: 'stageId' });
STAGE_DELETE_RULES.references.push({ of: helpdeskSlas, field: 'stageId' }, { of: helpdeskTicketSlas, field: 'expectedStageId' });
