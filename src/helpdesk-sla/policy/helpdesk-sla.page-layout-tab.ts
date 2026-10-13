import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';

// A Filter tab on Twenty's own policy page; its fields stay on the left.
export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.policyFilterTab,
    objectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Filter',
    position: 11,
    icon: 'IconFilter',
    widgets: [
      frontComponentWidget(
        HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.policyFilterWidget,
        'Filter',
        HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.policyFilterFrontComponent,
      ),
    ],
  }),
);
