import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useTranslate } from 'twenty-sdk/front-component';

import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type PickingFacts } from 'src/stock/facts/types/picking-facts.type';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

// The texts the route answers, listed here so the extractor puts them in the catalog.
export const RECORD_FACTS_ROUTE_TEXTS = [msg('Choose one record.'), msg('Record not found.')];

const PickingFactsWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<PickingFacts>
      kind="picking"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={(facts) => (
        <>
          {facts.warningText === '' ? null : <div style={{ ...styles.card, whiteSpace: 'pre-wrap' }}>{facts.warningText}</div>}
          {facts.returnCount > 0 ? <div>{t('Returns: {count}', { count: facts.returnCount })}</div> : null}
          <div>{facts.isSigned ? t('Signed') : t('Not signed')}</div>
          {facts.hasTracking ? <div>{t('Has products tracked by lot or serial number')}</div> : null}
        </>
      )}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.pickingFacts,
  name: 'platform-stock-picking-facts',
  description: 'Transfer warning text, returns, signature and tracking.',
  component: PickingFactsWidget,
});
