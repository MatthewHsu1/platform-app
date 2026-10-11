import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { randomId } from 'src/shared/utils/random-id.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import {
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readWorkspaceMembers } from 'src/stock/read-workspace-members';
import { queryAsUser } from 'src/stock/stock-front-graphql';
import { type WorkspaceMemberChoice } from 'src/stock/types/workspace-member-choice.type';
import { readStockStyles } from 'src/stock/stock-theme';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

type Mode = 'NEW' | 'EXISTING';
type OpenBatch = { id: string; name: string | null; description: string | null };

type BatchPage = {
  stockPickingBatches: { edges: { node: OpenBatch }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

// The open batch transfers the user can read, newest number first, page by page.
const loadOpenBatches = async () => {
  const batches: OpenBatch[] = [];
  let after: string | null = null;

  do {
    const data: BatchPage = await queryAsUser<BatchPage>(
      `query OpenBatches($after: String) {
        stockPickingBatches(
          filter: { isWave: { eq: false }, state: { in: [DRAFT, IN_PROGRESS] } }
          orderBy: [{ name: DescNullsLast }]
          first: 200
          after: $after
        ) {
          edges { node { id name description } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
    );

    batches.push(...data.stockPickingBatches.edges.map(({ node }) => node));
    after = data.stockPickingBatches.pageInfo.hasNextPage ? data.stockPickingBatches.pageInfo.endCursor : null;
  } while (after !== null);

  return batches;
};

// A batch is shown with its description, so batches of one type can be told apart.
const batchLabel = (batch: OpenBatch) => {
  const name = textOrNull(batch.name) ?? '';
  const description = textOrNull(batch.description);

  return description === null ? name : `${name}: ${description}`;
};

const memberLabel = (member: WorkspaceMemberChoice) => [member.name?.firstName, member.name?.lastName].filter(Boolean).join(' ');

const AddToBatch = () => {
  const { t } = useTranslate();
  const theme = themeCssVariables;
  const styles = readStockStyles();
  const pickingIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('Could not add to batch.'));
  const [batches, setBatches] = useState<OpenBatch[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberChoice[]>([]);
  const [mode, setMode] = useState<Mode>('NEW');
  const [batchId, setBatchId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [isCreateDraft, setIsCreateDraft] = useState(false);
  const [description, setDescription] = useState('');
  const [runId] = useState(randomId);

  useRunOnce(() => {
    loadOpenBatches()
      .then(setBatches)
      .catch(() => setError(t('The open batch transfers could not be read.')));
    readWorkspaceMembers()
      .then(setMembers)
      .catch(() => setError(t('The users could not be read.')));
  });

  if (pickingIds.length === 0) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  const confirm = async () => {
    const result = await call<{ message: string }>(STOCK_PICKING_BATCH_ROUTE_PATHS.addToBatch, {
      pickingIds,
      mode,
      batchId: mode === 'EXISTING' ? batchId : null,
      responsibleId: mode === 'NEW' && responsibleId !== '' ? responsibleId : null,
      description: mode === 'NEW' ? description : null,
      isCreateDraft: mode === 'NEW' && isCreateDraft,
      runId,
    });

    if (result !== null) {
      await finishWith(result.message);
    }
  };

  return (
    <PopupPanel title={t('Add to batch')}>
      <FieldRow label={t('Add to')}>
        <ChoiceSelect<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'EXISTING', label: t('an existing batch transfer') },
            { value: 'NEW', label: t('a new batch transfer') },
          ]}
        />
      </FieldRow>
      {mode === 'NEW' ? (
        <>
          <FieldRow label={t('Description')}>
            <Input value={description} onValueChange={setDescription} />
          </FieldRow>
          <FieldRow label={t('Responsible')}>
            <ChoiceSelect
              value={responsibleId}
              onChange={setResponsibleId}
              options={[{ value: '', label: t('Nobody') }, ...members.map((member) => ({ value: member.id, label: memberLabel(member) }))]}
            />
          </FieldRow>
          <label style={styles.row}>
            <input type="checkbox" checked={isCreateDraft} onChange={(event) => setIsCreateDraft(event.target.checked)} />
            {t('Draft')}
          </label>
          <span style={{ color: theme.font.color.tertiary }}>{t('Create the batch in draft status')}</span>
        </>
      ) : (
        <FieldRow label={t('Batch Transfer')}>
          {batches.length === 0 ? (
            <span style={{ color: theme.font.color.tertiary }}>{t('There is no open batch transfer.')}</span>
          ) : (
            <ChoiceSelect
              value={batchId}
              onChange={setBatchId}
              options={batches.map((batch) => ({ value: batch.id, label: batchLabel(batch) }))}
            />
          )}
        </FieldRow>
      )}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={busy || (mode === 'EXISTING' && batchId === '')}
          onClick={() => void confirm()}
        >
          {t('Confirm')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.addToBatch,
  name: 'stock-picking-batch-add-to-batch',
  description: 'Asks which batch transfer the selected transfers go into, a new one or an open one.',
  component: AddToBatch,
});
