import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  Trans,
  unmountFrontComponent,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { checkSelection } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  CANCEL_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CANCEL_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const CancelPicking = () => {
  const { t } = useTranslate();
  const pickingIds = useSelectedRecordIds();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    void unmountFrontComponent();
    void closeSidePanel();
  };

  const confirm = async () => {
    const selectionMessage = checkSelection(pickingIds.length, 'many');
    if (selectionMessage !== null) {
      setError(t(selectionMessage));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await postAppRoute(CANCEL_PICKING_ROUTE_PATH, { pickingIds });
      await enqueueSnackbar({ message: t('Transfer cancelled.'), variant: 'success' });
      close();
    } catch (caught) {
      setError(describeRouteError(caught, t('Could not cancel the transfer.')));
      setIsSaving(false);
    }
  };

  const styles = readStockStyles();

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Are you sure you want to cancel this transfer?</Trans>
      </div>
      {error === null ? null : <div style={styles.error}>{error}</div>}
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={isSaving} onClick={() => void confirm()}>
          {t('Yes')}
        </Button>
        <Button size="sm" variant="outline" disabled={isSaving} onClick={close}>
          {t('No')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CANCEL_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-cancel-picking',
  description: 'Asks to confirm, then cancels the selected transfers.',
  component: CancelPicking,
});
