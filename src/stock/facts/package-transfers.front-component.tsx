import { defineFrontComponent } from 'twenty-sdk/define';
import { type MessageDescriptor, msg, useTranslate } from 'twenty-sdk/front-component';

import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { FactsPanel } from 'src/stock/facts/facts-panel';
import { type PackageTransferLine } from 'src/stock/facts/types/package-transfer-line.type';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

const STATE_TEXT: Record<string, MessageDescriptor> = {
  [PICKING_STATE.DRAFT]: msg('Draft'),
  [PICKING_STATE.WAITING]: msg('Waiting Another Operation'),
  [PICKING_STATE.CONFIRMED]: msg('Waiting'),
  [PICKING_STATE.ASSIGNED]: msg('Ready'),
  [PICKING_STATE.DONE]: msg('Done'),
  [PICKING_STATE.CANCEL]: msg('Cancelled'),
};

const PackageTransfers = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const stateLabel = (state: string) => {
    const label = STATE_TEXT[state];

    return label === undefined ? state : t(label);
  };

  return (
    <FactsPanel<{ lines: PackageTransferLine[] }>
      kind="packageTransfers"
      text={{ loading: t('Loading…'), loadFailed: t('Could not load these values.') }}
      render={({ lines }) =>
        lines.length === 0 ? (
          <div style={styles.muted}>{t('No open transfer uses this package.')}</div>
        ) : (
          <DataTable<PackageTransferLine>
            rowKey={(row) => row.id}
            rows={lines}
            columns={[
              { key: 'transfer', title: t('Transfer'), render: (row) => row.transfer },
              { key: 'product', title: t('Product'), render: (row) => row.product },
              { key: 'quantity', title: t('Quantity'), render: (row) => row.quantity },
              { key: 'package', title: t('Destination Package'), render: (row) => row.package },
              { key: 'state', title: t('Status'), render: (row) => stateLabel(row.transferState) },
            ]}
          />
        )
      }
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: RECORD_FACTS_UNIVERSAL_IDENTIFIERS.packageTransfers,
  name: 'platform-stock-package-transfers',
  description: 'Open move lines that put things in a package, and their transfers.',
  component: PackageTransfers,
});
