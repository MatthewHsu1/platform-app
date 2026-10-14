import { defineView } from 'twenty-sdk/define';

import {
  FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
  FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { ACTIVITY_ALL_FIELDS, ACTIVITY_VISIBLE_FIELDS } from 'src/fieldservice-activity/views/activity-all-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: PAGE_IDS.orderView,
    name: 'Order activities',
    objectUniversalIdentifier: FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: ACTIVITY_VISIBLE_FIELDS,
    all: ACTIVITY_ALL_FIELDS,
    parentField: FIELD_IDS.fsmOrder,
  }),
);
