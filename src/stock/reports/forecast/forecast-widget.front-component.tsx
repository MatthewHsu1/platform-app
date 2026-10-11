import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { ForecastView } from 'src/stock/reports/forecast/forecast-view';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { type ForecastText } from 'src/stock/reports/forecast/types/forecast-text.type';
import {
  FORECAST_RESERVE_ROUTE_PATH,
  FORECAST_ROUTE_PATH,
  FORECAST_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';

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
  const recordId = selectedIds.length === 1 ? selectedIds[0] : null;
  const loadFailed = t('Could not load the forecast.');
  const changing = usePopUpCall(t('Could not change the reservation.'));
  const [data, setData] = useState<ForecastAnswer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (recordId === null || requestKey === undefined) {
      return;
    }
    // An answer for a record the view has since moved past is dropped.
    let isCurrent = true;

    void postAppRoute<ForecastAnswer>(FORECAST_ROUTE_PATH, { [requestKey]: recordId })
      .then((next) => {
        if (isCurrent) {
          setData(next);
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (isCurrent) {
          setLoadError(describeRouteError(caught, loadFailed));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [recordId, requestKey, version, loadFailed]);

  const runLinked = async (moveId: string, action: 'reserve' | 'unreserve') => {
    const done = await changing.call(FORECAST_RESERVE_ROUTE_PATH, { moveId, action });

    if (done !== null) {
      setVersion((current) => current + 1);
    }
  };

  if (recordId === null || requestKey === undefined) {
    return (
      <div style={styles.panel}>
        <div>{t('Select all is not supported here. Tick the records you want instead.')}</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('Forecasted Report')}</div>
      <ErrorText error={loadError ?? changing.error} />
      {data === null && loadError === null ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {data === null ? null : (
        <ForecastView
          data={data}
          text={FORECAST_TEXT}
          busy={changing.busy}
          onReserve={(moveId) => void runLinked(moveId, 'reserve')}
          onUnreserve={(moveId) => void runLinked(moveId, 'unreserve')}
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
