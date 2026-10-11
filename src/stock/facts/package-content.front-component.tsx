import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type PackageContentFacts } from 'src/stock/facts/types/package-content-facts.type';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { type PackageContentLine } from 'src/stock/utils/types/package-content-line.type';

const PackageContentWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<PackageContentFacts>
      kind="packageContent"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={(content) => (
        <>
          <div>{content.lines.length === 0 ? <span style={styles.muted}>{t('Empty package')}</span> : content.description}</div>
          <div>{t('Weight: {weight}', { weight: content.weight })}</div>
          {content.ownerName === '' ? null : <div>{t('Owner: {name}', { name: content.ownerName })}</div>}
          {content.lines.length === 0 ? null : (
            <DataTable<PackageContentLine>
              rowKey={(row) => `${row.uomName}|${row.productId}`}
              rows={content.lines}
              columns={[
                { key: 'product', title: t('Product'), render: (row) => row.productName },
                { key: 'quantity', title: t('Quantity'), render: (row) => row.quantity },
                { key: 'unit', title: t('Unit'), render: (row) => row.uomName },
              ]}
            />
          )}
        </>
      )}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.packageContent,
  name: 'platform-stock-package-content',
  description: 'What a package and the packages inside it hold, their weight and owner.',
  component: PackageContentWidget,
});
