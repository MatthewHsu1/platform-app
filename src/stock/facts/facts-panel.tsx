import { type ReactNode, useEffect, useState } from 'react';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type FactsPanelText } from 'src/stock/facts/types/facts-panel-text.type';
import { type RecordFactsKind } from 'src/stock/facts/types/record-facts-kind.type';
import { RECORD_FACTS_ROUTE_PATH } from 'src/stock/stock-reports-universal-identifiers.constant';

// Loads the values of the record on the page and hands them to `render`. The
// texts come from the widget: the translation extractor reads only widget files.
export const FactsPanel = <TFacts,>({
  kind,
  text,
  render,
}: {
  kind: RecordFactsKind;
  text: FactsPanelText;
  render: (facts: TFacts) => ReactNode;
}) => {
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const recordId = selectedIds.length === 1 ? selectedIds[0] : null;
  const [facts, setFacts] = useState<TFacts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { loadFailed } = text;

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    // An answer for a record the page has since moved past is dropped.
    let isCurrent = true;

    setFacts(null);
    setError(null);

    void postAppRoute<{ facts: TFacts }>(RECORD_FACTS_ROUTE_PATH, { kind, recordId })
      .then((answer) => {
        if (isCurrent) {
          setFacts(answer.facts);
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
  }, [kind, recordId, loadFailed]);

  if (recordId === null) {
    return null;
  }

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      {facts === null && error === null ? <div style={styles.muted}>{text.loading}</div> : null}
      {facts === null ? null : render(facts)}
    </div>
  );
};
