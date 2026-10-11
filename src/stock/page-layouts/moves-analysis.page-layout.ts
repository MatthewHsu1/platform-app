import {
  AggregateOperations,
  definePageLayout,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import { MOVE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import {
  MOVES_ANALYSIS_UNIVERSAL_IDENTIFIERS as IDS,
  STOCK_VIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const DONE_ONLY = {
  recordFilters: [
    { fieldMetadataUniversalIdentifier: F.state, operand: 'IS', value: JSON.stringify([MOVE_STATE.DONE]) },
  ],
};

const CHART_DEFAULTS = {
  aggregateFieldMetadataUniversalIdentifier: F.quantity,
  aggregateOperation: AggregateOperations.SUM,
  axisNameDisplay: 'NONE',
  color: 'auto',
  timezone: 'UTC',
  firstDayOfTheWeek: 1,
  filter: DONE_ONLY,
} as const;

const gridCell = (row: number, column: number, rowSpan: number, columnSpan: number) => ({
  layoutMode: PageLayoutTabLayoutMode.GRID as const,
  row,
  column,
  rowSpan,
  columnSpan,
});

const barChart = (
  universalIdentifier: string,
  title: string,
  groupBy: { field: string; subFieldName?: string },
  row: number,
  column: number,
) => ({
  universalIdentifier,
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  position: gridCell(row, column, 6, 6),
  configuration: {
    configurationType: 'BAR_CHART' as const,
    ...CHART_DEFAULTS,
    primaryAxisGroupByFieldMetadataUniversalIdentifier: groupBy.field,
    primaryAxisGroupBySubFieldName: groupBy.subFieldName,
    primaryAxisOrderBy: 'VALUE_DESC',
    layout: 'VERTICAL',
  },
});

export default definePageLayout({
  universalIdentifier: IDS.pageLayout,
  name: 'Moves Analysis',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: IDS.tab,
      title: 'Moves Analysis',
      position: 0,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        barChart(IDS.widgetByProduct, 'Done quantity by product', { field: F.product }, 0, 0),
        barChart(IDS.widgetByType, 'Done quantity by operation type', { field: F.pickingType }, 0, 6),
        // Grouped by full name: two warehouses can each have a location called "Stock".
        barChart(
          IDS.widgetByDestination,
          'Done quantity by destination',
          { field: F.locationDest, subFieldName: 'completeName' },
          6,
          0,
        ),
        {
          universalIdentifier: IDS.widgetByMonth,
          title: 'Done quantity by month',
          type: 'GRAPH' as const,
          objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
          position: gridCell(6, 6, 6, 6),
          configuration: {
            configurationType: 'LINE_CHART' as const,
            ...CHART_DEFAULTS,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: F.date,
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.MONTH,
            primaryAxisOrderBy: 'FIELD_ASC',
          },
        },
        {
          universalIdentifier: IDS.widgetTable,
          title: 'Done moves',
          type: 'RECORD_TABLE' as const,
          objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
          position: gridCell(12, 0, 8, 12),
          configuration: {
            configurationType: 'RECORD_TABLE' as const,
            viewUniversalIdentifier: STOCK_VIEW_UNIVERSAL_IDENTIFIERS.movesAnalysis,
            isUIEditable: false,
          },
        },
      ],
    },
  ],
});
