import { useCallback, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { getApplicationVariable, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import {
  MARK_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_DUPLICATE_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { RecordSearchPicker } from 'src/shared/front-components/record-search-picker';
import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';
import { escapeLike } from 'src/shared/utils/escape-like.util';

type StageChoice = { id: string; name: string | null; sequence: number | null };

const KEEP_STAGE = '';

// Cases whose number or title holds the text, as "number - title".
const searchCases = async (text: string): Promise<PickedRecord[]> => {
  const pattern = `%${escapeLike(text)}%`;
  const data = await queryAsUser<{ helpdeskTickets: { edges: { node: { id: string; number: string | null; name: string | null } }[] } }>(
    `query FindCases($filter: HelpdeskTicketFilterInput) {
      helpdeskTickets(filter: $filter, orderBy: [{ createdAt: DescNullsLast }], first: 20) { edges { node { id number name } } }
    }`,
    { filter: { or: [{ number: { ilike: pattern } }, { name: { ilike: pattern } }] } },
  );

  return data.helpdeskTickets.edges.map(({ node }) => ({ id: node.id, label: `${node.number ?? ''} - ${node.name ?? ''}` }));
};

const MarkDuplicate = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const caseIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('Could not mark the case as a duplicate.'));
  const [original, setOriginal] = useState<PickedRecord | null>(null);
  const [stages, setStages] = useState<StageChoice[] | null>(null);
  const [stageId, setStageId] = useState(getApplicationVariable('HELPDESK_DUPLICATE_TICKET_STAGE') ?? KEEP_STAGE);
  const tracking = getApplicationVariable('HELPDESK_DUPLICATE_TRACKING') === 'true';

  useRunOnce(() => {
    queryAsUser<{ helpdeskTicketStages: { edges: { node: StageChoice }[] } }>(
      `{ helpdeskTicketStages(filter: { active: { eq: true } }, orderBy: [{ sequence: AscNullsLast }], first: 200) {
        edges { node { id name sequence } }
      } }`,
    )
      .then((data) => setStages(data.helpdeskTicketStages.edges.map(({ node }) => node)))
      .catch(() => {
        setStages([]);
        setError(t('The stages could not be read.'));
      });
  });

  const search = useCallback(searchCases, []);

  if (caseIds.length !== 1) {
    return <ClosablePanel message={null} error={t('Select one work case.')} busy={false} closeLabel={t('Close')} />;
  }
  if (!tracking) {
    return (
      <ClosablePanel message={null} error={t('Duplicate tracking is turned off in the work case settings.')} busy={false} closeLabel={t('Close')} />
    );
  }

  const markDuplicate = async () => {
    const result = await call<{ caseId: string }>(MARK_DUPLICATE_ROUTE_PATH, {
      caseId: caseIds[0],
      originalId: original?.id ?? null,
      stageId: stageId === KEEP_STAGE ? null : stageId,
    });

    if (result !== null) {
      await finishWith(t('Case marked as duplicate.'));
    }
  };

  return (
    <div className="platform-helpdesk-mark-duplicate" style={styles.panel}>
      <div style={styles.title}>{t('Mark as duplicate')}</div>
      <label style={{ ...styles.row, alignItems: 'flex-start' }}>
        <span>{t('Original case')}</span>
        <RecordSearchPicker
          value={original}
          placeholder={t('Search by number or title')}
          clearLabel={t('Change')}
          searchErrorLabel={t('The search failed.')}
          search={search}
          onChange={setOriginal}
          disabled={busy}
        />
      </label>
      <label style={styles.row}>
        <span>{t('Move to stage')}</span>
        <ChoiceSelect
          value={stageId}
          disabled={stages === null || busy}
          options={[
            { value: KEEP_STAGE, label: t('Keep the stage') },
            ...(stages ?? []).map((stage) => ({ value: stage.id, label: stage.name ?? '' })),
          ]}
          onChange={setStageId}
        />
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy || original === null} onClick={() => void markDuplicate()}>
          {t('Mark as duplicate')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MARK_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'mark-work-case-duplicate',
  description: 'Asks for the original case and the stage to move to, then marks the open work case as a duplicate.',
  component: MarkDuplicate,
});
