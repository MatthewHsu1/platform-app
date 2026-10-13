import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { searchPeople } from 'src/crm/lead/actions/components/customer-search';
import { useSalesChoices } from 'src/crm/lead/actions/components/use-sales-choices';
import {
  CONVERT_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CONVERT_LEADS_PREPARE_ROUTE_PATH,
  CONVERT_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { RecordSearchPicker } from 'src/shared/front-components/record-search-picker';
import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';
import { randomId } from 'src/shared/utils/random-id.util';

type Group = { leadId: string; leadName: string | null; matches: { id: string; name: string | null; email: string | null }[] };

const NONE = '';

const ConvertLeads = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const leadIds = useSelectedRecordIds();
  const choices = useSalesChoices();
  const { busy, error, call } = usePopUpCall(t('Could not convert the leads.'));
  const preparing = usePopUpCall(t('Could not read the selected leads.'));
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [deduplicate, setDeduplicate] = useState(true);
  const [action, setAction] = useState<CustomerAction>('EACH_EXIST_OR_CREATE');
  const [person, setPerson] = useState<PickedRecord | null>(null);
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  // One id per opened dialog: a second click after a stopped run finds the companies the first one made.
  const [runId] = useState(randomId);

  // The duplicates are read once, when the dialog opens; the team follows each change of salespersons.
  const prepare = async (nextSalespersonIds: string[], nextTeamId: string | null, withDuplicates: boolean) => {
    const result = await preparing.call<{ teamId: string | null; groups?: Group[] }>(CONVERT_LEADS_PREPARE_ROUTE_PATH, {
      leadIds,
      salespersonIds: nextSalespersonIds,
      teamId: nextTeamId,
      withDuplicates,
    });

    if (result !== null) {
      setTeamId(result.teamId);
      if (result.groups !== undefined) {
        setGroups(result.groups);
      }
    }
  };

  useRunOnce(() => {
    if (leadIds.length > 0) {
      void prepare([], null, true);
    }
  });

  const selectionMessage = checkSelection(leadIds.length, 'many');
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

  const toggleSalesperson = (memberId: string) => {
    const next = salespersonIds.includes(memberId) ? salespersonIds.filter((id) => id !== memberId) : [...salespersonIds, memberId];

    setSalespersonIds(next);
    void prepare(next, teamId, false);
  };

  const apply = async () => {
    const result = await call<{ leadIds: string[] }>(CONVERT_LEADS_ROUTE_PATH, {
      leadIds,
      runId,
      deduplicate,
      customerAction: action,
      personId: action === 'EXIST' ? (person?.id ?? null) : null,
      salespersonIds,
      teamId,
      force,
    });

    if (result !== null) {
      await finishWith(t('Leads converted.'));
      if (result.leadIds[0] !== undefined) {
        await navigate(AppPath.RecordShowPage, { objectNameSingular: 'crmLead', objectRecordId: result.leadIds[0] });
      }
    }
  };

  const working = busy || preparing.busy;
  const radio = (value: CustomerAction, label: string) => (
    <label key={value} style={styles.row}>
      <input type="radio" name="customer" value={value} checked={action === value} disabled={working} onChange={() => setAction(value)} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="platform-crm-convert-many" style={styles.panel}>
      <div style={styles.title}>{t('Convert to opportunities')}</div>
      <label style={styles.row}>
        <input type="checkbox" checked={deduplicate} disabled={working} onChange={(event) => setDeduplicate(event.target.checked)} />
        <span>{t('Merge with existing leads of the same customer')}</span>
      </label>
      {deduplicate ? (
        <div style={styles.card}>
          <div style={styles.muted}>{t('Selected leads with duplicates (the duplicates may be outside the selection):')}</div>
          {groups === null ? (
            <div style={styles.muted}>{preparing.error === null ? t('Loading…') : ''}</div>
          ) : groups.length === 0 ? (
            <div>{t('No duplicates found.')}</div>
          ) : (
            groups.map((group) => (
              <div key={group.leadId}>
                <strong>{group.leadName ?? ''}</strong>: {group.matches.map((match) => match.name ?? match.email ?? '').join(', ')}
              </div>
            ))
          )}
        </div>
      ) : null}
      <div style={styles.card}>
        {radio('EACH_EXIST_OR_CREATE', t('Use the existing contact or create one'))}
        {radio('CREATE', t('Create a new customer'))}
        {radio('EXIST', t('Link to an existing customer'))}
        {action === 'EXIST' ? (
          <RecordSearchPicker
            value={person}
            placeholder={t('Search a contact')}
            clearLabel={t('Clear')}
            searchErrorLabel={t('The search failed. Try again.')}
            search={searchPeople}
            disabled={working}
            onChange={setPerson}
          />
        ) : null}
      </div>
      <div style={styles.card}>
        <div>{t('Salespersons')}</div>
        {choices.members.map((member) => (
          <label key={member.id} style={styles.row}>
            <input
              type="checkbox"
              checked={salespersonIds.includes(member.id)}
              disabled={working}
              onChange={() => toggleSalesperson(member.id)}
            />
            <span>{member.label}</span>
          </label>
        ))}
      </div>
      <label style={styles.row}>
        <span>{t('Sales team')}</span>
        <ChoiceSelect
          value={teamId ?? NONE}
          disabled={working}
          options={[{ value: NONE, label: t('None') }, ...choices.teams.map((team) => ({ value: team.id, label: team.label }))]}
          onChange={(value) => setTeamId(value === NONE ? null : value)}
        />
      </label>
      <label style={styles.row}>
        <input type="checkbox" checked={force} disabled={working} onChange={(event) => setForce(event.target.checked)} />
        <span>{t('Force assignment')}</span>
      </label>
      <ErrorText error={choices.failed ? t('The salespeople and teams could not be read.') : null} />
      <ErrorText error={preparing.error} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={working} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={working || (action === 'EXIST' && person === null)} onClick={() => void apply()}>
          {t('Convert')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CONVERT_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'convert-leads',
  description: 'Converts the selected leads to opportunities, merging their duplicates first.',
  component: ConvertLeads,
});
