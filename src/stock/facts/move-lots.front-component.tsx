import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { type MoveLotTotal } from 'src/stock/utils/types/move-lot-total.type';

const MoveLots = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<{ lots: MoveLotTotal[] }>
      kind="moveLots"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={({ lots }) =>
        lots.length === 0 ? (
          <div style={styles.muted}>{t('No lots or serial numbers')}</div>
        ) : (
          <DataTable<MoveLotTotal>
            rowKey={(row) => row.lotId}
            rows={lots}
            columns={[
              { key: 'name', title: t('Lot/Serial Number'), render: (row) => row.name },
              { key: 'quantity', title: t('Quantity'), render: (row) => row.quantity },
            ]}
          />
        )
      }
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.moveLots,
  name: 'platform-stock-move-lots',
  description: 'Lots and serial numbers of the lines of a stock move.',
  component: MoveLots,
});
