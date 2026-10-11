import { defineView, ViewFilterGroupLogicalOperator, ViewFilterOperand } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import {
  booleanIs,
  filterGroupId,
  OPEN_PICKING_STATES,
  selectIs,
  transferView,
  valueless,
} from 'src/stock/views/view-helpers';

const VIEW = VIEWS.late;
const ALL = filterGroupId(VIEW, 'all');
const LATE = filterGroupId(VIEW, 'late');

// Open, and a deadline issue, a passed deadline or a passed scheduled date.
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
      valueless(VIEW, F.dateDeadline, ViewFilterOperand.IS_IN_PAST, { group: LATE, positionInGroup: 1 }),
      valueless(VIEW, F.scheduledDate, ViewFilterOperand.IS_IN_PAST, { group: LATE, positionInGroup: 2 }),
    ],
  }),
);
