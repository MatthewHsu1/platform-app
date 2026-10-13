import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, msg, navigate, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { searchCompanies, searchPeople } from 'src/crm/lead/actions/components/customer-search';
import { useSalesChoices } from 'src/crm/lead/actions/components/use-sales-choices';
import {
  CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_PREPARE_ROUTE_PATH,
  CONVERT_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { convertRequestCompanyId } from 'src/crm/lead/actions/utils/convert-request-company.util';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { DataTable } from 'src/shared/front-components/data-table';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { RecordSearchPicker } from 'src/shared/front-components/record-search-picker';
import { randomId } from 'src/shared/utils/random-id.util';

// The texts the convert buttons answer or write. The translation extractor reads only front-component files, so
// they are listed here to reach the catalog; each must match its source text.
export const CONVERT_TEXTS = [
  msg('This lead is already an opportunity.'),
  msg('Only a pending lead can be converted. Restore a lost lead first.'),
  msg('A lead at 100 % is closed and cannot be converted.'),
  msg('Choose the contact to link.'),
  msg('Select at least two leads.'),
  msg('{name} has more than {max} duplicates. Merge some of them first.'),
  msg('Notes from the lead {name}'),
  msg('Contact created without email'),
  msg('Another contact already uses {email}, so the new contact was made without it.'),
  msg('Company created without website'),
  msg('Another company already uses the website {website}, so the new company was made without it.'),
];

type Duplicate = { id: string; name: string | null; leadType: string | null; email: string | null; stage: string | null };
type Prepared = {
  conversion: 'CONVERT' | 'MERGE';
  customerAction: 'CREATE' | 'EXIST';
  personId: string | null;
  personLabel: string | null;
  companyId: string | null;
  companyLabel: string | null;
  salespersonId: string | null;
  teamId: string | null;
  showCompany: boolean;
  duplicates: Duplicate[];
};

const NONE = '';

const ConvertLead = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const [leadId] = useSelectedRecordIds();
  const choices = useSalesChoices();
  const { busy, error, call } = usePopUpCall(t('Could not convert the lead.'));
  const preparing = usePopUpCall(t('Could not read the lead.'));
  const [state, setState] = useState<Prepared | null>(null);
  const [force, setForce] = useState(true);
  // One id per opened dialog: a second click after a stopped run finds the customer the first one made.
  const [runId] = useState(randomId);

  const prepare = async (request: Record<string, unknown>) => {
    const result = await preparing.call<Prepared>(CONVERT_LEAD_PREPARE_ROUTE_PATH, { leadId, ...request });

    if (result !== null) {
      setState(result);
    }
  };

  useRunOnce(() => {
    if (leadId !== undefined) {
      void prepare({});
    }
  });

  if (leadId === undefined) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  // The dialog's choices so far; a key left out takes its default again.
  const recompute = (change: Record<string, unknown>) => {
    if (state !== null) {
      void prepare({
        conversion: state.conversion,
        customerAction: state.customerAction,
        personId: state.personId,
        companyId: state.companyId,
        salespersonId: state.salespersonId,
        teamId: state.teamId,
        ...change,
      });
    }
  };

  const apply = async () => {
    if (state === null) {
      return;
    }
    const result = await call<{ leadId: string }>(CONVERT_LEAD_ROUTE_PATH, {
      leadId,
      runId,
      conversion: state.conversion,
      customerAction: state.customerAction,
      personId: state.personId,
      companyId: convertRequestCompanyId(state),
      salespersonId: state.salespersonId,
      teamId: state.teamId,
      force,
    });

    if (result !== null) {
      await finishWith(t('Lead converted.'));
      await navigate(AppPath.RecordShowPage, { objectNameSingular: 'crmLead', objectRecordId: result.leadId });
    }
  };

  const working = busy || preparing.busy;
  const radio = (name: string, value: string, checked: boolean, label: string, onPick: () => void) => (
    <label key={value} style={styles.row}>
      <input type="radio" name={name} value={value} checked={checked} disabled={working} onChange={onPick} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="platform-crm-convert" style={styles.panel}>
      <div style={styles.title}>{t('Convert to opportunity')}</div>
      {state === null ? (
        <div style={styles.muted}>{preparing.error === null ? t('Loading…') : ''}</div>
      ) : (
        <>
          <div style={styles.card}>
            {radio('conversion', 'CONVERT', state.conversion === 'CONVERT', t('Convert to opportunity'), () =>
              setState({ ...state, conversion: 'CONVERT' }),
            )}
            {radio('conversion', 'MERGE', state.conversion === 'MERGE', t('Merge with existing opportunities'), () =>
              setState({ ...state, conversion: 'MERGE' }),
            )}
          </div>
          {state.conversion === 'MERGE' ? (
            <DataTable
              rows={state.duplicates}
              rowKey={(row) => row.id}
              columns={[
                { key: 'name', title: t('Lead'), render: (row) => row.name ?? '' },
                { key: 'email', title: t('Email'), render: (row) => row.email ?? '' },
                { key: 'stage', title: t('Stage'), render: (row) => row.stage ?? '' },
                { key: 'type', title: t('Type'), render: (row) => (row.leadType === 'OPPORTUNITY' ? t('Opportunity') : t('Lead')) },
              ]}
            />
          ) : (
            <div style={styles.card}>
              {radio('customer', 'CREATE', state.customerAction === 'CREATE', t('Create a new customer'), () =>
                recompute({ customerAction: 'CREATE', personId: null }),
              )}
              {radio('customer', 'EXIST', state.customerAction === 'EXIST', t('Link to an existing customer'), () =>
                recompute({ customerAction: 'EXIST', personId: undefined }),
              )}
              {state.customerAction === 'EXIST' && state.personId === null && state.companyId !== null ? (
                <div style={styles.muted}>{t('Customer: {name}', { name: state.companyLabel ?? '' })}</div>
              ) : null}
              {state.customerAction === 'EXIST' ? (
                <RecordSearchPicker
                  value={state.personId === null ? null : { id: state.personId, label: state.personLabel ?? '' }}
                  placeholder={t('Search a contact')}
                  clearLabel={t('Clear')}
                  searchErrorLabel={t('The search failed. Try again.')}
                  search={searchPeople}
                  disabled={working}
                  onChange={(record) => recompute({ personId: record?.id ?? null })}
                />
              ) : null}
              {state.showCompany ? (
                <RecordSearchPicker
                  value={state.companyId === null ? null : { id: state.companyId, label: state.companyLabel ?? '' }}
                  placeholder={t('Company (leave empty for none)')}
                  clearLabel={t('Clear')}
                  searchErrorLabel={t('The search failed. Try again.')}
                  search={searchCompanies}
                  disabled={working}
                  onChange={(record) => recompute({ companyId: record?.id ?? null })}
                />
              ) : null}
            </div>
          )}
          <label style={styles.row}>
            <span>{t('Salesperson')}</span>
            <ChoiceSelect
              value={state.salespersonId ?? NONE}
              disabled={working}
              options={[{ value: NONE, label: t('None') }, ...choices.members.map((member) => ({ value: member.id, label: member.label }))]}
              onChange={(value) => recompute({ salespersonId: value === NONE ? null : value })}
            />
          </label>
          <label style={styles.row}>
            <span>{t('Sales team')}</span>
            <ChoiceSelect
              value={state.teamId ?? NONE}
              disabled={working}
              options={[{ value: NONE, label: t('None') }, ...choices.teams.map((team) => ({ value: team.id, label: team.label }))]}
              onChange={(value) => setState({ ...state, teamId: value === NONE ? null : value })}
            />
          </label>
          <label style={styles.row}>
            <input type="checkbox" checked={force} disabled={working} onChange={(event) => setForce(event.target.checked)} />
            <span>{t('Force assignment')}</span>
          </label>
        </>
      )}
      <ErrorText error={choices.failed ? t('The salespeople and teams could not be read.') : null} />
      <ErrorText error={preparing.error} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={working} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={working || state === null} onClick={() => void apply()}>
          {t('Apply')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'convert-lead',
  description: 'Converts the open lead to an opportunity, or merges it with its duplicates, and assigns it.',
  component: ConvertLead,
});
