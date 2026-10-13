import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_LOST_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { randomId } from 'src/shared/utils/random-id.util';

// The answers of the Mark lost, Restore and Use automatic probability routes. The translation extractor reads
// only front-component files, so they are listed here to reach the catalog; each must match its source text.
export const LEAD_ACTION_TEXTS = [
  msg('Select one lead.'),
  msg('Select at least one lead.'),
  msg('{count} of the selected leads were not found.'),
  msg('A won lead cannot be marked lost: {names}.'),
  msg('A lead in a won stage stays at 100 %. Move these leads to another stage first: {names}.'),
  msg('Lost comment'),
  msg('Only a lost lead can be restored.'),
  msg('Only a pending lead can follow the automatic probability.'),
  msg('The probability already follows the automatic one.'),
  msg('Your role does not allow this.'),
  msg('This action needs a signed-in person: an API key cannot use it.'),
];

type LostReason = { id: string; name: string | null };

const NO_REASON = '';

const MarkLost = () => {
  const { t } = useTranslate();
  const theme = themeCssVariables;
  const styles = readPopUpStyles();
  const leadIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('Could not mark the leads lost.'));
  const [reasons, setReasons] = useState<LostReason[] | null>(null);
  const [reasonId, setReasonId] = useState(NO_REASON);
  const [closingNote, setClosingNote] = useState('');
  // One id per opened dialog: a second click after a stopped run finds the notes the first one wrote.
  const [runId] = useState(randomId);

  useRunOnce(() => {
    queryAsUser<{ crmLostReasons: { edges: { node: LostReason }[] } }>(
      `{ crmLostReasons(filter: { active: { eq: true } }, orderBy: [{ name: AscNullsLast }], first: 200) {
        edges { node { id name } }
      } }`,
    )
      .then((data) => setReasons(data.crmLostReasons.edges.map(({ node }) => node)))
      .catch(() => {
        setReasons([]);
        setError(t('The lost reasons could not be read.'));
      });
  });

  if (leadIds.length === 0) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  const markLost = async () => {
    const result = await call<{ leadIds: string[] }>(MARK_LOST_ROUTE_PATH, {
      leadIds,
      lostReasonId: reasonId === NO_REASON ? null : reasonId,
      closingNote,
      runId,
    });

    if (result !== null) {
      await finishWith(leadIds.length === 1 ? t('Lead marked lost.') : t('{count} leads marked lost.', { count: leadIds.length }));
    }
  };

  return (
    <div className="platform-crm-mark-lost" style={styles.panel}>
      <div style={styles.title}>{t('Mark lost')}</div>
      <label style={styles.row}>
        <span>{t('Lost reason')}</span>
        <ChoiceSelect
          value={reasonId}
          disabled={reasons === null || busy}
          options={[
            { value: NO_REASON, label: t('No reason') },
            ...(reasons ?? []).map((reason) => ({ value: reason.id, label: reason.name ?? '' })),
          ]}
          onChange={setReasonId}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <span>{t('Closing note')}</span>
        <textarea
          value={closingNote}
          rows={5}
          disabled={busy}
          onChange={(event) => setClosingNote(event.target.value)}
          style={{
            padding: theme.spacing[2],
            borderRadius: theme.border.radius.sm,
            border: `1px solid ${theme.border.color.medium}`,
            background: theme.background.transparent.lighter,
            color: theme.font.color.primary,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.md,
            resize: 'vertical',
          }}
        />
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy} onClick={() => void markLost()}>
          {t('Mark lost')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'mark-leads-lost',
  description: 'Asks for a lost reason and a closing note, then marks the selected leads lost.',
  component: MarkLost,
});
