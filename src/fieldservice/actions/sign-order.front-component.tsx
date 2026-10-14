import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, SIGN_ORDER_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { selectOneRecord } from 'src/shared/front-components/selection-check';

// Asks for the name of the person who signs; the time is the moment of the save.
const SignOrder = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const { id: orderId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());
  const { busy, error, call } = usePopUpCall(t('Could not sign the order.'));
  const [signedBy, setSignedBy] = useState('');

  if (orderId === null) {
    return <ClosablePanel message={null} error={t(selectionMessage)} busy={false} closeLabel={t('Close')} />;
  }

  const sign = async () => {
    const result = await call<{ orderId: string }>(SIGN_ORDER_ROUTE_PATH, { recordId: orderId, signedBy });

    if (result !== null) {
      await finishWith(t('Order signed.'));
    }
  };

  return (
    <div className="platform-fieldservice-sign" style={styles.panel}>
      <div style={styles.title}>{t('Sign the order')}</div>
      <label style={styles.row}>
        <span>{t('Signed by')}</span>
        <Input value={signedBy} disabled={busy} onValueChange={setSignedBy} />
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy || signedBy.trim() === ''} onClick={() => void sign()}>
          {t('Sign')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.signFrontComponent,
  name: 'sign-service-order',
  description: 'Asks for the name of the person who signs the completed service order.',
  component: SignOrder,
});
