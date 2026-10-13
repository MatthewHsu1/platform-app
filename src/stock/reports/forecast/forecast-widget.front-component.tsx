import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import { SELECTION_PROBLEM_TEXT, selectOneRecord } from 'src/shared/front-components/selection-check';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { ForecastView } from 'src/stock/reports/forecast/forecast-view';
import { type ForecastText } from 'src/stock/reports/forecast/types/forecast-text.type';
import { useForecastReport } from 'src/stock/reports/forecast/use-forecast-report';
import { FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

// The texts the routes answer, listed here so the extractor puts them in the catalog.
export const FORECAST_ROUTE_TEXTS = [
  msg('Choose a product, a move or a reordering rule.'),
  msg('Record not found.'),
  msg('Please create a warehouse first.'),
  msg('Choose a delivery move to reserve or unreserve.'),
  msg('Move not found.'),
];

export const FORECAST_TEXT: ForecastText = {
  warehouse: msg('Warehouse: {name}'),
  onHand: msg('On Hand'),
  toRemove: msg('To Remove'),
  incoming: msg('Incoming'),
  outgoing: msg('Outgoing'),
  forecasted: msg('Forecasted'),
  free: msg('Free'),
  timeToReplenish: msg('Time to replenish:'),
  days: msg('{days} day(s)'),
  today: msg('Today'),
  earliestArrival: msg('Earliest Possible Arrival'),
  available: msg('Available'),
  usedBy: msg('Used by'),
  deliveryDate: msg('Delivery Date'),
  expectedOn: msg(': {quantity} {unit} expected on {date}'),
  stockInTransit: msg('Stock In Transit'),
  freeStockInTransit: msg('Free Stock in Transit'),
  stockToReserve: msg('Stock To Reserve: {quantity} {unit}'),
  expiredStock: msg('Expired Stock'),
  freeStock: msg('Free Stock'),
  notAvailable: msg('Not Available'),
  toRemoveNow: msg('To remove now'),
  toRemoveOn: msg('To remove on {date}'),
  reserve: msg('Reserve'),
  reserveQuantity: msg('Reserve ({quantity} {unit})'),
  unreserve: msg('Unreserve'),
  forecastedInventory: msg('Forecasted Inventory'),
  incomingDraft: msg('Incoming Draft Transfer'),
  outgoingDraft: msg('Outgoing Draft Transfer'),
  forecastedWithPending: msg('Forecasted with Pending'),
  graphEmpty: msg('Try to add some incoming or outgoing transfers.'),
  truncated: msg('Some move chains were too long to read in full.'),
};

// The record a Forecasted button or a Forecast tab is about, as the route asks for it.
const REQUEST_KEY_BY_OBJECT: Record<string, string> = {
  productTemplate: 'productTemplateId',
  productProduct: 'productId',
  stockMove: 'moveId',
  stockWarehouseOrderpoint: 'orderpointId',
};

const ForecastWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const requestKey = REQUEST_KEY_BY_OBJECT[useSelectedObjectMetadata()?.nameSingular ?? ''];
  const { id: recordId, message: selectionMessage } = selectOneRecord(selectedIds);
  const report = useForecastReport({
    requestKey,
    recordId,
    loadFailed: t('Could not load the forecast.'),
    changeFailed: t('Could not change the reservation.'),
  });

  if (recordId === null || requestKey === undefined) {
    return (
      <div style={styles.panel}>
        <div>{t(selectionMessage ?? SELECTION_PROBLEM_TEXT.none)}</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('Forecasted Report')}</div>
      <ErrorText error={report.error} />
      {report.data === null && report.error === null ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {report.data === null ? null : (
        <ForecastView
          data={report.data}
          text={FORECAST_TEXT}
          busy={report.busy}
          onReserve={(moveId) => void report.runLinked(moveId, 'reserve')}
          onUnreserve={(moveId) => void report.runLinked(moveId, 'unreserve')}
        />
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.widget,
  name: 'platform-stock-forecast',
  description: 'Forecasted report of a product, a move or a reordering rule: stock, planned receipts and deliveries.',
  component: ForecastWidget,
});
