import { useEffect, useState } from 'react';

import { describeRouteError } from 'src/shared/describe-route-error';
import { usePopUpCall } from 'src/shared/front-components/pop-up';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { FORECAST_RESERVE_ROUTE_PATH, FORECAST_ROUTE_PATH } from 'src/stock/stock-reports-universal-identifiers.constant';

// Loads the report of the record on the page, and runs Reserve and Unreserve on a delivery move
// (the report then loads again). The texts come from the widget: the translation extractor reads only widget files.
export const useForecastReport = ({
  requestKey,
  recordId,
  loadFailed,
  changeFailed,
}: {
  requestKey: string | undefined;
  recordId: string | null;
  loadFailed: string;
  changeFailed: string;
}) => {
  const changing = usePopUpCall(changeFailed);
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

  return { data, error: loadError ?? changing.error, busy: changing.busy, runLinked };
};
