import { definePageLayoutTab } from 'twenty-sdk/define';

import { TEAM_ASSIGNMENT_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import {
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as IDS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabAssignment,
    objectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Assignment',
    position: 11,
    icon: 'IconFilter',
    widgets: [
      frontComponentWidget(CRM_SCREEN_IDS.teamCountersWidget, 'Counters', CRM_SCREEN_IDS.teamCounters),
      frontComponentWidget(IDS.widgetAssignmentFilter, 'Assignment filter', TEAM_ASSIGNMENT_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER),
    ],
  }),
);
