import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { textOrNull } from 'src/shared/utils/text-or-null.util';
import {
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readWorkspaceMembers } from 'src/shared/front-components/read-workspace-members';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { type WorkspaceMemberChoice } from 'src/shared/front-components/types/workspace-member-choice.type';
import { readStockStyles } from 'src/stock/stock-theme';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

type Mode = 'NEW' | 'EXISTING';
type OpenWave = { id: string; name: string | null; description: string | null };
type LineChoice = { id: string; label: string };

type WavePage = {
  stockPickingBatches: { edges: { node: OpenWave }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

// The open wave transfers the user can read, newest number first, page by page.
const loadOpenWaves = async () => {
  const waves: OpenWave[] = [];
  let after: string | null = null;

  do {
    const data: WavePage = await queryAsUser<WavePage>(
      `query OpenWaves($after: String) {
        stockPickingBatches(
          filter: { isWave: { eq: true }, state: { in: [DRAFT, IN_PROGRESS] } }
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

    waves.push(...data.stockPickingBatches.edges.map(({ node }) => node));
    after = data.stockPickingBatches.pageInfo.hasNextPage ? data.stockPickingBatches.pageInfo.endCursor : null;
  } while (after !== null);

  return waves;
};

// A wave is shown with its description, so waves of one type can be told apart.
const waveLabel = (wave: OpenWave) => {
  const name = textOrNull(wave.name) ?? '';
  const description = textOrNull(wave.description);

  return description === null ? name : `${name}: ${description}`;
};

const memberLabel = (member: WorkspaceMemberChoice) => [member.name?.firstName, member.name?.lastName].filter(Boolean).join(' ');

// Opened on move lines, the selection is the lines. Opened on transfers, it
// first lists their open lines, all ticked, for the person to untick what
// stays out.
const AddToWave = () => {
  const { t } = useTranslate();
  const theme = themeCssVariables;
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const fromPickings = useSelectedObjectMetadata()?.nameSingular === 'stockPicking';
  const { busy, error, setError, call } = usePopUpCall(t('Could not add to the wave.'));
  const [lines, setLines] = useState<LineChoice[] | null>(null);
  const [linesFailed, setLinesFailed] = useState(false);
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [waves, setWaves] = useState<OpenWave[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberChoice[]>([]);
  const [mode, setMode] = useState<Mode>('EXISTING');
  const [waveId, setWaveId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');

  useRunOnce(() => {
    if (selectedIds.length === 0) {
      return;
    }
    if (fromPickings) {
      call<{ lines: LineChoice[] }>(STOCK_PICKING_BATCH_ROUTE_PATHS.addToWaveLines, { pickingIds: selectedIds })
        .then((result) => {
          if (result === null) {
            setLinesFailed(true);
            return;
          }
          setLines(result.lines);
          setChosenIds(result.lines.map((line) => line.id));
        })
        .catch(() => setLinesFailed(true));
    }
    loadOpenWaves()
      .then(setWaves)
      .catch(() => setError(t('The open wave transfers could not be read.')));
    readWorkspaceMembers()
      .then(setMembers)
      .catch(() => setError(t('The users could not be read.')));
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
  if (fromPickings && (linesFailed || lines === null)) {
    return (
      <ClosablePanel
        message={t('Reading the operations…')}
        error={linesFailed ? (error ?? t('Could not add to the wave.')) : null}
        busy={busy}
        closeLabel={t('Close')}
      />
    );
  }
  const lineIds = fromPickings ? (lines ?? []).map((line) => line.id).filter((id) => chosenIds.includes(id)) : selectedIds;

  const toggle = (lineId: string, checked: boolean) =>
    setChosenIds((current) => (checked ? [...current, lineId] : current.filter((id) => id !== lineId)));

  const confirm = async () => {
    const result = await call<{ message: string }>(STOCK_PICKING_BATCH_ROUTE_PATHS.addToWave, {
      lineIds,
      mode,
      waveId: mode === 'EXISTING' ? waveId : null,
      responsibleId: mode === 'NEW' && responsibleId !== '' ? responsibleId : null,
    });

    if (result !== null) {
      await finishWith(result.message);
    }
  };

  return (
    <PopupPanel title={t('Add to wave')}>
      {lines === null ? null : (
        <FieldRow label={t('Operations')}>
          {lines.length === 0 ? (
            <span style={{ color: theme.font.color.tertiary }}>{t('These transfers have no open operation.')}</span>
          ) : (
            lines.map((line) => (
              <label key={line.id} style={styles.row}>
                <input
                  type="checkbox"
                  checked={chosenIds.includes(line.id)}
                  onChange={(event) => toggle(line.id, event.target.checked)}
                />
                {line.label}
              </label>
            ))
          )}
        </FieldRow>
      )}
      <FieldRow label={t('Add to')}>
        <ChoiceSelect<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'EXISTING', label: t('an existing wave transfer') },
            { value: 'NEW', label: t('a new wave transfer') },
          ]}
        />
      </FieldRow>
      {mode === 'EXISTING' ? (
        <FieldRow label={t('Wave Transfer')}>
          {waves.length === 0 ? (
            <span style={{ color: theme.font.color.tertiary }}>{t('There is no open wave transfer.')}</span>
          ) : (
            <ChoiceSelect
              value={waveId}
              onChange={setWaveId}
              options={[
                { value: '', label: t('Choose a wave transfer') },
                ...waves.map((wave) => ({ value: wave.id, label: waveLabel(wave) })),
              ]}
            />
          )}
        </FieldRow>
      ) : (
        <FieldRow label={t('Responsible')}>
          <ChoiceSelect
            value={responsibleId}
            onChange={setResponsibleId}
            options={[{ value: '', label: t('Nobody') }, ...members.map((member) => ({ value: member.id, label: memberLabel(member) }))]}
          />
        </FieldRow>
      )}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={busy || lineIds.length === 0 || (mode === 'EXISTING' && waveId === '')}
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
  universalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.addToWave,
  name: 'stock-picking-batch-add-to-wave',
  description: 'Asks which wave transfer the chosen move lines go into, a new one or an open one.',
  component: AddToWave,
});
