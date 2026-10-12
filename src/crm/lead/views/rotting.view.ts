import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS as F, CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { leadListColumns } from 'src/crm/lead/views/lead-list-columns';
import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import { booleanIs, sortBy } from 'src/stock/views/view-helpers';

const VIEW = CRM_SCREEN_IDS.rottingView;

export default defineView({
  universalIdentifier: VIEW,
  name: 'Rotting',
  objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconClockExclamation',
  position: 3,
  fields: leadListColumns(VIEW),
  filters: [booleanIs(VIEW, F.isRotting, true)],
  sorts: [sortBy(VIEW, F.rottingDays, ViewSortDirection.DESC)],
});
