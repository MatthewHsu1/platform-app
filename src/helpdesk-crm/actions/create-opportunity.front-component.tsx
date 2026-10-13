import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { useSalesChoices } from 'src/crm/lead/actions/components/use-sales-choices';
import {
  CREATE_OPPORTUNITY_ROUTE_PATH,
  HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-crm/helpdesk-crm-universal-identifiers.constant';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';

const NOBODY = '';

const CreateOpportunity = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const caseIds = useSelectedRecordIds();
  const choices = useSalesChoices();
  const { busy, error, call } = usePopUpCall(t('Could not create the opportunity.'));
  const [salespersonId, setSalespersonId] = useState(NOBODY);
  const [crmTeamId, setCrmTeamId] = useState(NOBODY);

  if (caseIds.length !== 1) {
    return <ClosablePanel message={null} error={t('Select one work case.')} busy={false} closeLabel={t('Close')} />;
  }

  const create = async () => {
    const result = await call<{ leadId: string; leadName: string }>(CREATE_OPPORTUNITY_ROUTE_PATH, {
      caseId: caseIds[0],
      salespersonId: salespersonId === NOBODY ? null : salespersonId,
      crmTeamId: crmTeamId === NOBODY ? null : crmTeamId,
    });

    if (result !== null) {
      await finishWith(t('Opportunity {name} created.', { name: result.leadName }));
      await navigate(AppPath.RecordShowPage, { objectNameSingular: 'crmLead', objectRecordId: result.leadId });
    }
  };

  return (
    <div className="platform-helpdesk-create-opportunity" style={styles.panel}>
      <div style={styles.title}>{t('Create opportunity')}</div>
      <label style={styles.row}>
        <span>{t('Salesperson')}</span>
        <ChoiceSelect
          value={salespersonId}
          disabled={busy}
          options={[{ value: NOBODY, label: t('Case assignee') }, ...choices.members.map((member) => ({ value: member.id, label: member.label }))]}
          onChange={setSalespersonId}
        />
      </label>
      <label style={styles.row}>
        <span>{t('Sales team')}</span>
        <ChoiceSelect
          value={crmTeamId}
          disabled={busy}
          options={[{ value: NOBODY, label: t('None') }, ...choices.teams.map((team) => ({ value: team.id, label: team.label }))]}
          onChange={setCrmTeamId}
        />
      </label>
      <ErrorText error={error ?? (choices.failed ? t('The salespeople and sales teams could not be read.') : null)} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy} onClick={() => void create()}>
          {t('Create opportunity')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOpportunityFrontComponent,
  name: 'create-opportunity-from-work-case',
  description: 'Asks for a salesperson and a sales team, then creates an opportunity from the open work case.',
  component: CreateOpportunity,
});
