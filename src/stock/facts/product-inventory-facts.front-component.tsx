import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type ProductInventoryFacts } from 'src/stock/facts/types/product-inventory-facts.type';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

type OrderpointRow = ProductInventoryFacts['orderpoints'][number];
type PutawayRow = ProductInventoryFacts['putawayRules'][number];
type CapacityRow = ProductInventoryFacts['storageCapacities'][number];

const ProductInventoryFactsWidget = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();

  return (
    <FactsPanel<ProductInventoryFacts>
      kind="productInventory"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={(facts) => (
        <>
          <div>{t('Next serial: {value}', { value: facts.nextSerial })}</div>
          <div>{t('In (last 12 months): {count}', { count: facts.movesIn })}</div>
          <div>{t('Out (last 12 months): {count}', { count: facts.movesOut })}</div>
          <div>
            {t('Reordering rules: {count} (min {min}, max {max})', {
              count: facts.nbrReorderingRules,
              min: facts.reorderingMinQty,
              max: facts.reorderingMaxQty,
            })}
          </div>
          {facts.orderpoints.length === 0 ? null : (
            <>
              <div style={styles.title}>{t('Reordering rules of the variants')}</div>
              <DataTable<OrderpointRow>
                rowKey={(row) => row.id}
                rows={facts.orderpoints}
                columns={[
                  { key: 'variant', title: t('Variant'), render: (row) => row.variant },
                  { key: 'location', title: t('Location'), render: (row) => row.location },
                  { key: 'min', title: t('Min'), render: (row) => row.productMinQty },
                  { key: 'max', title: t('Max'), render: (row) => row.productMaxQty },
                ]}
              />
            </>
          )}
          {facts.putawayRules.length === 0 ? null : (
            <>
              <div style={styles.title}>{t('Putaway rules')}</div>
              <DataTable<PutawayRow>
                rowKey={(row) => row.id}
                rows={facts.putawayRules}
                columns={[
                  { key: 'locationIn', title: t('When product arrives in'), render: (row) => row.locationIn },
                  { key: 'locationOut', title: t('Store to'), render: (row) => row.locationOut },
                ]}
              />
            </>
          )}
          {facts.storageCapacities.length === 0 ? null : (
            <>
              <div style={styles.title}>{t('Storage capacities')}</div>
              <DataTable<CapacityRow>
                rowKey={(row) => row.id}
                rows={facts.storageCapacities}
                columns={[
                  { key: 'storageCategory', title: t('Storage category'), render: (row) => row.storageCategory },
                  { key: 'quantity', title: t('Quantity'), render: (row) => row.quantity },
                ]}
              />
            </>
          )}
        </>
      )}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.productInventoryFacts,
  name: 'platform-stock-product-inventory-facts',
  description: 'Next serial, moves of the last year and the reordering, putaway and capacity rules of the variants.',
  component: ProductInventoryFactsWidget,
});
