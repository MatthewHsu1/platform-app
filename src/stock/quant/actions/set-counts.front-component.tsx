import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, Trans, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { QuantRows } from 'src/stock/quant/actions/count-panels';
import { type CountQuantView } from 'src/stock/quant/types/count-quant-view.type';
import { type CountRouteResult } from 'src/stock/quant/types/count-route-result.type';
import { type CountRowsText } from 'src/stock/quant/types/count-rows-text.type';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  SET_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const ROW_TEXT: CountRowsText = {
  counted: msg('Counted: {counted}'),
  onHand: msg('On hand: {onHand}'),
  difference: msg('Difference: {difference}'),
};

// "Quantities already set" opens only when some selected rows have a count.
const SetCounts = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, call } = usePopUpCall(t('The counts could not be set.'));
  const [alreadySet, setAlreadySet] = useState<CountQuantView[] | null>(null);

  const run = async (onlyUnset: boolean) => {
    const result = await call<CountRouteResult>(SET_COUNTS_ROUTE_PATH, { quantIds: selectedIds, onlyUnset });

    if (result === null) {
      return;
    }
    if (result.kind === 'needsAnswer') {
      setAlreadySet(result.quants);
      return;
    }
    await finishWith(t('Counts set.'));
  };

  useRunOnce(() => {
    if (selectedIds.length > 0) {
      void run(false);
    }
  });

  const selectionMessage = checkSelection(selectedIds.length, 'many');
  if (selectionMessage !== null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }
  if (alreadySet === null) {
    return <ClosablePanel message={busy ? t('Working…') : null} error={error} busy={busy} closeLabel={t('Close')} />;
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Quantities already set</Trans>
      </div>
      <div>
        <Trans>These rows already have a count. Set only the other rows?</Trans>
      </div>
      <QuantRows rows={alreadySet} text={ROW_TEXT} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void run(true)}>
          {t('Set')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SET_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-set-counts',
  description: 'Copies the stock into the count of the selected rows.',
  component: SetCounts,
});
