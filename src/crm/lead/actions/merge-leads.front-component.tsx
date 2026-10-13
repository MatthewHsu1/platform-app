import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, msg, navigate, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { useSalesChoices } from 'src/crm/lead/actions/components/use-sales-choices';
import {
  MERGE_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MERGE_LEADS_PREPARE_ROUTE_PATH,
  MERGE_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { DataTable } from 'src/shared/front-components/data-table';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';

// The texts a merge writes or answers. The translation extractor reads only front-component files, so they are
// listed here to reach the catalog; each must match its source text.
export const MERGE_TEXTS = [
  msg('Select at least two leads to merge.'),
  msg('Select at least two leads to merge. Won leads are left out.'),
  msg('Merge at most {max} leads at a time.'),
  msg('Merge summary'),
  msg('From {name}: {title}'),
  msg('From {name}'),
  msg('{name} (from {lead})'),
  msg('Merged the lead **{name}** into this one.'),
  msg('Expected revenue: {amount}'),
  msg('Recurring revenue: {amount}'),
  msg('Probability: {probability} %'),
  msg('Type: {type}'),
  msg('Opportunity'),
  msg('Lead'),
  msg('Stage: {stage}'),
  msg('Priority: {priority}'),
  msg('Low'),
  msg('Medium'),
  msg('High'),
  msg('Very High'),
  msg('Lost reason: {reason}'),
  msg('Created on: {date}'),
  msg('Expected closing: {date}'),
  msg('Notes: {notes}'),
  msg('Language: {language}'),
  msg('Referred by: {referred}'),
  msg('Tags: {tags}'),
  msg('Salesperson: {name}'),
  msg('Sales team: {name}'),
  msg('Contact details'),
  msg('Contact: {value}'),
  msg('Company name: {value}'),
  msg('Phone: {value}'),
  msg('Email: {value}'),
  msg('Website: {value}'),
  msg('Job position: {value}'),
  msg('Address'),
  msg('Marketing'),
  msg('Campaign: {value}'),
  msg('Medium: {value}'),
  msg('Source: {value}'),
];

type MergeLine = { id: string; name: string | null; leadType: string | null; stage: string | null; probability: number | null };
type Prepared = { leads: MergeLine[]; leftOut: { id: string; name: string | null }[]; teamId: string | null };

const NONE = '';

const MergeLeads = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const leadIds = useSelectedRecordIds();
  const choices = useSalesChoices();
  const { busy, error, call } = usePopUpCall(t('Could not merge the leads.'));
  const preparing = usePopUpCall(t('Could not read the selected leads.'));
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [salespersonId, setSalespersonId] = useState(NONE);
  const [teamId, setTeamId] = useState(NONE);

  const prepare = async (nextSalespersonId: string, nextTeamId: string) => {
    const result = await preparing.call<Prepared>(MERGE_LEADS_PREPARE_ROUTE_PATH, {
      leadIds,
      salespersonId: nextSalespersonId === NONE ? null : nextSalespersonId,
      teamId: nextTeamId === NONE ? null : nextTeamId,
    });

    if (result !== null) {
      setPrepared(result);
      setTeamId(result.teamId ?? NONE);
    }
  };

  useRunOnce(() => {
    if (leadIds.length > 0) {
      void prepare(NONE, NONE);
    }
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

  const merge = async () => {
    const result = await call<{ leadId: string }>(MERGE_LEADS_ROUTE_PATH, {
      leadIds,
      salespersonId: salespersonId === NONE ? null : salespersonId,
      teamId: teamId === NONE ? null : teamId,
    });

    if (result !== null) {
      await finishWith(t('Leads merged.'));
      await navigate(AppPath.RecordShowPage, { objectNameSingular: 'crmLead', objectRecordId: result.leadId });
    }
  };

  return (
    <div className="platform-crm-merge" style={styles.panel}>
      <div style={styles.title}>{t('Merge leads')}</div>
      {prepared === null ? (
        <div style={styles.muted}>{preparing.error === null ? t('Loading…') : ''}</div>
      ) : (
        <>
          <div style={styles.muted}>{t('The first lead is kept; the others are merged into it and go to the trash.')}</div>
          <DataTable
            rows={prepared.leads}
            rowKey={(row) => row.id}
            columns={[
              { key: 'name', title: t('Lead'), render: (row) => row.name ?? '' },
              { key: 'type', title: t('Type'), render: (row) => (row.leadType === 'OPPORTUNITY' ? t('Opportunity') : t('Lead')) },
              { key: 'stage', title: t('Stage'), render: (row) => row.stage ?? '' },
              { key: 'probability', title: t('Probability'), render: (row) => `${row.probability ?? 0} %` },
            ]}
          />
          {prepared.leftOut.length > 0 ? (
            <div style={styles.muted}>
              {t('Won leads are left out: {names}', { names: prepared.leftOut.map((lead) => lead.name ?? '').join(', ') })}
            </div>
          ) : null}
          <label style={styles.row}>
            <span>{t('Salesperson')}</span>
            <ChoiceSelect
              value={salespersonId}
              disabled={busy || preparing.busy}
              options={[
                { value: NONE, label: t('Keep the merged one') },
                ...choices.members.map((member) => ({ value: member.id, label: member.label })),
              ]}
              onChange={(value) => {
                setSalespersonId(value);
                void prepare(value, teamId);
              }}
            />
          </label>
          <label style={styles.row}>
            <span>{t('Sales team')}</span>
            <ChoiceSelect
              value={teamId}
              disabled={busy || preparing.busy}
              options={[
                { value: NONE, label: t('Keep the merged one') },
                ...choices.teams.map((team) => ({ value: team.id, label: team.label })),
              ]}
              onChange={setTeamId}
            />
          </label>
        </>
      )}
      <ErrorText error={choices.failed ? t('The salespeople and teams could not be read.') : null} />
      <ErrorText error={preparing.error} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy || preparing.busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy || preparing.busy || prepared === null || prepared.leads.length < 2} onClick={() => void merge()}>
          {t('Merge')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MERGE_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'merge-leads',
  description: 'Shows the selected leads in merge order and merges them into the first.',
  component: MergeLeads,
});
