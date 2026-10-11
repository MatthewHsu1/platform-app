import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type ResultPackageRow } from 'src/stock/facts/types/result-package-row.type';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

const PickingResultPackages = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<{ packages: ResultPackageRow[] }>
      kind="pickingResultPackages"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={({ packages }) =>
        packages.length === 0 ? (
          <div style={styles.muted}>{t('No packages')}</div>
        ) : (
          <DataTable<ResultPackageRow>
            rowKey={(row) => row.id}
            rows={packages}
            columns={[
              { key: 'name', title: t('Package'), render: (row) => row.name },
              { key: 'location', title: t('Location'), render: (row) => row.location },
            ]}
          />
        )
      }
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.pickingResultPackages,
  name: 'platform-stock-picking-result-packages',
  description: 'Packages an open transfer puts its products in, with the packages those go into.',
  component: PickingResultPackages,
});
