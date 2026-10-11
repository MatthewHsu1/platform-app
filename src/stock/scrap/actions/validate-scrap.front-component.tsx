import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import { ClosablePanel, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { InsufficientQuantityPanel } from 'src/stock/scrap/actions/scrap-panels';
import { type InsufficientQuantityText } from 'src/stock/scrap/types/insufficient-quantity-text.type';
import { type ScrapValidateAnswer } from 'src/stock/scrap/types/scrap-validate-answer.type';
import {
  DISCARD_SCRAP_ROUTE_PATH,
  VALIDATE_SCRAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  VALIDATE_SCRAP_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const INSUFFICIENT_TEXT: InsufficientQuantityText = {
  title: msg('Insufficient quantity to scrap'),
  body: msg('{location} holds less than {quantity} {unit} of {product}. Scrapping anyway may leave the stock out of step with the shelves.'),
  currentStock: msg('Stock in internal locations'),
  confirm: msg('Confirm'),
  discard: msg('Discard'),
};

const ValidateScrap = () => {
  const { t } = useTranslate();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, call } = usePopUpCall(t('The scrap could not be validated.'));
  const [answer, setAnswer] = useState<Extract<ScrapValidateAnswer, { kind: 'needsAnswer' }> | null>(null);

  const validate = async (confirmInsufficient: boolean) => {
    const result = await call<ScrapValidateAnswer>(VALIDATE_SCRAP_ROUTE_PATH, { scrapIds: selectedIds, confirmInsufficient });

    if (result === null) {
      return;
    }
    if (result.kind === 'needsAnswer') {
      setAnswer(result);
      return;
    }
    await finishWith(t('Scrap done.'));
  };

  const discard = async () => {
    if ((await call(DISCARD_SCRAP_ROUTE_PATH, { scrapIds: selectedIds })) !== null) {
      await finishWith(t('Scrap discarded.'));
    }
  };

  useRunOnce(() => {
    if (selectedIds.length > 0) {
      void validate(false);
    }
  });

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
  if (answer === null) {
    return <ClosablePanel message={busy ? t('Working…') : null} error={error} busy={busy} closeLabel={t('Close')} />;
  }

  return (
    <InsufficientQuantityPanel
      answer={answer}
      text={INSUFFICIENT_TEXT}
      busy={busy}
      error={error}
      onConfirm={() => void validate(true)}
      onDiscard={() => void discard()}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: VALIDATE_SCRAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-validate',
  description: 'Validates the open scrap, asking first when the source location holds less.',
  component: ValidateScrap,
});
