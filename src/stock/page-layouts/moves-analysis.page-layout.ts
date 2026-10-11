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

// Bars group by full names: every warehouse has its own "Receipts" type and "Stock" location.
const OPERATION_TYPE = { field: F.pickingType, subFieldName: 'completeName' };
const DESTINATION = { field: F.locationDest, subFieldName: 'completeName' };

// Twenty stores one fixed zone per chart; the app keeps its dates in UTC.
const CHART_DEFAULTS = {
  axisNameDisplay: 'NONE',
  color: 'auto',
  timezone: 'UTC',
  firstDayOfTheWeek: 1,
  filter: DONE_ONLY,
} as const;

const SUM_OF_QUANTITY = {
  aggregateFieldMetadataUniversalIdentifier: F.quantity,
  aggregateOperation: AggregateOperations.SUM,
} as const;

const NUMBER_OF_MOVES = {
  aggregateFieldMetadataUniversalIdentifier: F.name,
  aggregateOperation: AggregateOperations.COUNT,
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
  position: ReturnType<typeof gridCell>,
) => ({
  universalIdentifier,
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  position,
  configuration: {
    configurationType: 'BAR_CHART' as const,
    ...CHART_DEFAULTS,
    ...SUM_OF_QUANTITY,
    primaryAxisGroupByFieldMetadataUniversalIdentifier: groupBy.field,
    primaryAxisGroupBySubFieldName: groupBy.subFieldName,
    primaryAxisOrderBy: 'VALUE_DESC',
    layout: 'VERTICAL',
  },
});

// One line per operation type, month by month.
const monthByTypeChart = (
  universalIdentifier: string,
  title: string,
  measure: typeof SUM_OF_QUANTITY | typeof NUMBER_OF_MOVES,
  position: ReturnType<typeof gridCell>,
) => ({
  universalIdentifier,
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  position,
  configuration: {
    configurationType: 'LINE_CHART' as const,
    ...CHART_DEFAULTS,
    ...measure,
    primaryAxisGroupByFieldMetadataUniversalIdentifier: F.date,
    primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.MONTH,
    primaryAxisOrderBy: 'FIELD_ASC',
    secondaryAxisGroupByFieldMetadataUniversalIdentifier: OPERATION_TYPE.field,
    secondaryAxisGroupBySubFieldName: OPERATION_TYPE.subFieldName,
    displayLegend: true,
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
        barChart(IDS.widgetByProduct, 'Done quantity by product', { field: F.product }, gridCell(0, 0, 6, 6)),
        barChart(IDS.widgetByType, 'Done quantity by operation type', OPERATION_TYPE, gridCell(0, 6, 6, 6)),
        barChart(IDS.widgetByDestination, 'Done quantity by destination', DESTINATION, gridCell(6, 0, 6, 12)),
        monthByTypeChart(IDS.widgetByMonth, 'Done quantity by month and operation type', SUM_OF_QUANTITY, gridCell(12, 0, 6, 6)),
        monthByTypeChart(IDS.widgetCountByMonth, 'Done moves by month and operation type', NUMBER_OF_MOVES, gridCell(12, 6, 6, 6)),
        {
          universalIdentifier: IDS.widgetTable,
          title: 'Done moves',
          type: 'RECORD_TABLE' as const,
          objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
          position: gridCell(18, 0, 8, 12),
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
