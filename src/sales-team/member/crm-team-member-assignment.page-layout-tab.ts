import { definePageLayoutTab } from 'twenty-sdk/define';

import { MEMBER_ASSIGNMENT_FILTERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import {
  CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_MEMBER_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabAssignment,
    objectUniversalIdentifier: CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Assignment',
    position: 11,
    icon: 'IconFilter',
    widgets: [frontComponentWidget(IDS.widgetAssignmentFilters, 'Assignment filters', MEMBER_ASSIGNMENT_FILTERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER)],
  }),
);
