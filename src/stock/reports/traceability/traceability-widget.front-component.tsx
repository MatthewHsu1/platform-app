import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { TraceabilityView } from 'src/stock/reports/traceability/traceability-view';
import { type TraceabilityAnswer } from 'src/stock/reports/traceability/types/traceability-answer.type';
import { type TraceabilityText } from 'src/stock/reports/traceability/types/traceability-text.type';
import { TRACEABILITY_ROUTE_PATH, TRACEABILITY_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

// The texts the route answers, listed here so the extractor puts them in the catalog.
export const TRACEABILITY_ROUTE_TEXTS = [
  msg('Choose a lot, a transfer or a move line.'),
  msg('Record not found.'),
  msg('Move line not found.'),
  msg('Inventory Adjustment'),
];

export const TRACEABILITY_TEXT: TraceabilityText = {
  unfoldFailed: msg('Could not unfold this line.'),
  empty: msg('No operation made on this lot.'),
  unfold: msg('Unfold'),
  fold: msg('Fold'),
  reference: msg('Reference'),
  product: msg('Product'),
  date: msg('Date'),
  lot: msg('Lot/Serial Number'),
  from: msg('From'),
  to: msg('To'),
  quantity: msg('Quantity'),
  deliveries: msg('Delivered in'),
  customers: msg('Customers'),
};

// The report of the record on the page, or of the one record a Traceability
// button was clicked for.
const TraceabilityWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const model = useSelectedObjectMetadata()?.nameSingular ?? 'stockLot';
  const recordId = selectedIds.length === 1 ? selectedIds[0] : null;
  const loadFailed = t('Could not load the traceability report.');
  const [data, setData] = useState<TraceabilityAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    // An answer for a record the view has since moved past is dropped.
    let isCurrent = true;

    setData(null);
    setError(null);

    void postAppRoute<TraceabilityAnswer>(TRACEABILITY_ROUTE_PATH, { model, recordId })
      .then((next) => {
        if (isCurrent) {
          setData(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (isCurrent) {
          setError(describeRouteError(caught, loadFailed));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [model, recordId, loadFailed]);

  if (recordId === null) {
    return (
      <div style={styles.panel}>
        <div>{t('Select all is not supported here. Tick the records you want instead.')}</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('Traceability Report')}</div>
      <ErrorText error={error} />
      {data === null && error === null ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {data === null ? null : <TraceabilityView key={`${model}:${recordId}`} model={model} recordId={recordId} data={data} text={TRACEABILITY_TEXT} onError={setError} />}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.widget,
  name: 'platform-stock-traceability',
  description: 'Traceability of a lot, a done transfer or a move line: where it came from and where it went.',
  component: TraceabilityWidget,
});
