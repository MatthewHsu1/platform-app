import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type ForecastText } from 'src/stock/reports/forecast/types/forecast-text.type';

// The texts of the summary-first report: the texts of the plain report and the headings, notes and chart captions of the summary.
export type ForecastSummaryText = ForecastText & {
  onHandNote: MessageDescriptor;
  incomingNote: MessageDescriptor;
  outgoingNote: MessageDescriptor;
  forecastedNote: MessageDescriptor;
  freeNote: MessageDescriptor;
  toRemoveNote: MessageDescriptor;
  summaryLabel: MessageDescriptor;
  chartTitle: MessageDescriptor;
  chartNote: MessageDescriptor;
  earliestChange: MessageDescriptor;
  endingStock: MessageDescriptor;
  planningTitle: MessageDescriptor;
  planningNote: MessageDescriptor;
  reservationsTitle: MessageDescriptor;
  reservationsNote: MessageDescriptor;
  reservationCount: MessageDescriptor;
  noReservations: MessageDescriptor;
  breakdownTitle: MessageDescriptor;
  breakdownNote: MessageDescriptor;
  freeStockNote: MessageDescriptor;
  forecastedInventoryNote: MessageDescriptor;
  forecastedWithPendingNote: MessageDescriptor;
  incomingDraftNote: MessageDescriptor;
  outgoingDraftNote: MessageDescriptor;
  equationTitle: MessageDescriptor;
  equationNote: MessageDescriptor;
};
