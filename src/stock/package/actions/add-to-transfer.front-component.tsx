import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { textOrNull } from 'src/shared/utils/text-or-null.util';
import {
  ADD_TO_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  ADD_TO_TRANSFER_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readStockStyles } from 'src/stock/stock-theme';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';
import { randomId } from 'src/shared/utils/random-id.util';

type OpenTransfer = { id: string; name: string | null };

type TransferPage = {
  stockPickings: { edges: { node: OpenTransfer }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

// Every open transfer the user can read, page by page.
const loadOpenTransfers = async () => {
  const transfers: OpenTransfer[] = [];
  let after: string | null = null;

  do {
    const data: TransferPage = await queryAsUser<TransferPage>(
      `query OpenTransfers($after: String) {
        stockPickings(
          filter: { not: { state: { in: [DONE, CANCEL] } } }
          orderBy: [{ scheduledDate: AscNullsLast }]
          first: 200
          after: $after
        ) {
          edges { node { id name } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
    );

    transfers.push(...data.stockPickings.edges.map(({ node }) => node));
    after = data.stockPickings.pageInfo.hasNextPage ? data.stockPickings.pageInfo.endCursor : null;
  } while (after !== null);

  return transfers;
};

const AddToTransfer = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const packageIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('Could not add the packages.'));
  const [transfers, setTransfers] = useState<OpenTransfer[] | null>(null);
  const [pickingId, setPickingId] = useState('');
  const [runId] = useState(randomId);

  useRunOnce(() => {
    loadOpenTransfers()
      .then((open) => {
        setTransfers(open);
        setPickingId(open[0]?.id ?? '');
      })
      .catch(() => {
        setTransfers([]);
        setError(t('The open transfers could not be read.'));
      });
  });

  const selectionMessage = checkSelection(packageIds.length, 'many');
  if (selectionMessage !== null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  const add = async () => {
    const result = await call<{ lineIds: string[] }>(ADD_TO_TRANSFER_ROUTE_PATH, { packageIds, pickingId, runId });

    if (result !== null) {
      await finishWith(t('Packages added to the transfer.'));
    }
  };

  if (transfers === null) {
    return <ClosablePanel message={t('Reading the open transfers…')} error={null} busy={false} closeLabel={t('Close')} />;
  }
  if (transfers.length === 0) {
    return <ClosablePanel message={t('There is no open transfer to add the packages to.')} error={error} busy={false} closeLabel={t('Close')} />;
  }

  return (
    <PopupPanel title={t('Add to Transfer')}>
      <FieldRow label={t('Transfer')}>
        <ChoiceSelect
          value={pickingId}
          onChange={setPickingId}
          options={transfers.map((transfer) => ({ value: transfer.id, label: textOrNull(transfer.name) ?? t('Unnamed transfer') }))}
        />
      </FieldRow>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy || pickingId === ''} onClick={() => void add()}>
          {t('Add')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: ADD_TO_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-package-add-to-transfer',
  description: 'Adds the selected packages, whole, to an open transfer.',
  component: AddToTransfer,
});
