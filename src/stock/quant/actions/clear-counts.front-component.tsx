import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, Trans, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { QuantRows, readQuantViewsAsUser } from 'src/stock/quant/actions/count-panels';
import { type CountQuantView } from 'src/stock/quant/types/count-quant-view.type';
import { type CountRowsText } from 'src/stock/quant/types/count-rows-text.type';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  CLEAR_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const ROW_TEXT: CountRowsText = {
  counted: msg('Counted: {counted}'),
  onHand: msg('On hand: {onHand}'),
  difference: msg('Difference: {difference}'),
};

// The administrator's Clear counts: the selected rows, then Clear or Discard.
const ClearCounts = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('The counts could not be cleared.'));
  const [rows, setRows] = useState<CountQuantView[]>([]);

  useRunOnce(() => {
    if (selectedIds.length === 0) {
      return;
    }
    readQuantViewsAsUser(selectedIds)
      .then(setRows)
      .catch(() => setError(t('The stock rows could not be read.')));
  });

  const clear = async () => {
    if ((await call(CLEAR_COUNTS_ROUTE_PATH, { quantIds: selectedIds })) !== null) {
      await finishWith(t('Counts cleared.'));
    }
  };

  if (selectedIds.length === 0) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Clear counts</Trans>
      </div>
      <QuantRows rows={rows} text={ROW_TEXT} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void clear()}>
          {t('Clear')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CLEAR_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-clear-counts',
  description: 'Shows the selected stock rows and clears their counts.',
  component: ClearCounts,
});
