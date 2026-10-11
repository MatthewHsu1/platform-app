import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type VariantQuantRow } from 'src/stock/facts/types/variant-quant-row.type';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

const VariantQuants = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<{ quants: VariantQuantRow[] }>
      kind="variantQuants"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={({ quants }) =>
        quants.length === 0 ? (
          <div style={styles.muted}>{t('No stock in the warehouses')}</div>
        ) : (
          <DataTable<VariantQuantRow>
            rowKey={(row) => row.id}
            rows={quants}
            columns={[
              { key: 'location', title: t('Location'), render: (row) => row.location },
              { key: 'lot', title: t('Lot/Serial Number'), render: (row) => row.lot },
              { key: 'quantity', title: t('Quantity'), render: (row) => row.quantity },
              {
                key: 'duplicated',
                title: t('Duplicated Serial Number'),
                render: (row) => (row.snDuplicated ? <span style={styles.error}>{t('Yes')}</span> : ''),
              },
            ]}
          />
        )
      }
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.variantQuants,
  name: 'platform-stock-variant-quants',
  description: 'Stock of a variant per warehouse location, with serial numbers found in two places.',
  component: VariantQuants,
});
