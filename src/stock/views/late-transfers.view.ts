import { defineView, ViewFilterGroupLogicalOperator } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import {
  beforeToday,
  booleanIs,
  filterGroupId,
  OPEN_PICKING_STATES,
  selectIs,
  transferView,
} from 'src/stock/views/view-helpers';

const VIEW = VIEWS.late;
const ALL = filterGroupId(VIEW, 'all');
const LATE = filterGroupId(VIEW, 'late');

// Open, and a deadline issue, or a deadline or scheduled date before today.
export default defineView(
  transferView({
    universalIdentifier: VIEW,
    name: 'Late',
    icon: 'IconAlertTriangle',
    position: 6,
    filterGroups: [
      { universalIdentifier: ALL, logicalOperator: ViewFilterGroupLogicalOperator.AND },
      {
        universalIdentifier: LATE,
        logicalOperator: ViewFilterGroupLogicalOperator.OR,
        parentViewFilterGroupUniversalIdentifier: ALL,
        positionInViewFilterGroup: 1,
      },
    ],
    filters: [
      selectIs(VIEW, F.state, OPEN_PICKING_STATES, { group: ALL, positionInGroup: 0 }),
      booleanIs(VIEW, F.hasDeadlineIssue, true, { group: LATE, positionInGroup: 0 }),
      beforeToday(VIEW, F.dateDeadline, { group: LATE, positionInGroup: 1 }),
      beforeToday(VIEW, F.scheduledDate, { group: LATE, positionInGroup: 2 }),
    ],
  }),
);
