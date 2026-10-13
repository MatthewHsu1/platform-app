import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Callout } from 'twenty-ui/components';

import { selectOneRecord } from 'src/shared/front-components/selection-check';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FORECAST_TEXT } from 'src/stock/reports/forecast/forecast-widget.front-component';
import { ForecastSummarySkeleton } from 'src/stock/reports/forecast/forecast-summary-skeleton';
import { ForecastSummaryView } from 'src/stock/reports/forecast/forecast-summary-view';
import { type ForecastSummaryText } from 'src/stock/reports/forecast/types/forecast-summary-text.type';
import { useForecastReport } from 'src/stock/reports/forecast/use-forecast-report';
import { FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

const SUMMARY_TEXT: ForecastSummaryText = {
  ...FORECAST_TEXT,
  summaryLabel: msg('Inventory summary'),
  onHandNote: msg('Current physical stock'),
  incomingNote: msg('Expected receipts'),
  outgoingNote: msg('Demand and reservations'),
  forecastedNote: msg('On hand + incoming − outgoing'),
  freeNote: msg('Available to use'),
  toRemoveNote: msg('Past its removal date'),
  chartTitle: msg('Inventory forecast'),
  chartNote: msg('Projected stock level over the days around today'),
  earliestChange: msg('Earliest projected change'),
  endingStock: msg('Ending stock'),
  planningTitle: msg('Planning dates'),
  planningNote: msg('Key dates used for this forecast'),
  reservationsTitle: msg('Reservations and outgoing stock'),
  reservationsNote: msg('Where the stock goes, and what covers each delivery'),
  reservationCount: msg('Lines: {count}'),
  noReservations: msg('Nothing is planned to leave or arrive.'),
  breakdownTitle: msg('Inventory breakdown'),
  breakdownNote: msg('Stock totals by forecast measure'),
  freeStockNote: msg('Not reserved or allocated'),
  forecastedInventoryNote: msg('Current stock adjusted for outgoing and incoming'),
  forecastedWithPendingNote: msg('Includes draft transfers'),
  incomingDraftNote: msg('Receipts not yet confirmed'),
  outgoingDraftNote: msg('Deliveries not yet confirmed'),
  equationTitle: msg('How forecasted stock is calculated'),
  equationNote: msg('The quantities behind the forecast, added up'),
};

const ForecastProductWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const { id: recordId, message: selectionMessage } = selectOneRecord(selectedIds);
  const report = useForecastReport({
    requestKey: 'productTemplateId',
    recordId,
    loadFailed: t('Could not load the forecast.'),
    changeFailed: t('Could not change the reservation.'),
  });

  if (recordId === null) {
    return (
      <div style={styles.panel}>
        <Callout variant="neutral" title={t(selectionMessage)} />
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <ErrorText error={report.error} />
      {report.data === null && report.error === null ? <ForecastSummarySkeleton label={t('Loading…')} /> : null}
      {report.data === null ? null : (
        <ForecastSummaryView
          data={report.data}
          text={SUMMARY_TEXT}
          busy={report.busy}
          onReserve={(moveId) => void report.runLinked(moveId, 'reserve')}
          onUnreserve={(moveId) => void report.runLinked(moveId, 'unreserve')}
        />
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.productWidget,
  name: 'platform-stock-forecast-product',
  description: 'Forecast tab of a product: totals first, then the stock graph, planning dates, reservations and the sum behind the forecast.',
  component: ForecastProductWidget,
});
