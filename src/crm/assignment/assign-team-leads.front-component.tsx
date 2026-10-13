import { defineFrontComponent } from 'twenty-sdk/define';
import { CommandModal, enqueueSnackbar, msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import { ASSIGN_TEAM_LEADS_ROUTE_PATH, ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

// The answers of the assignment routes
// (src/crm/assignment/assignment-route-messages.constant.ts), listed for the
// extractor; each must match its source text exactly.
export const ASSIGNMENT_ROUTE_TEXTS = [
  msg('Only a sales administrator can assign leads.'),
  msg('teamId is required.'),
  msg('Team not found.'),
  msg('This team uses neither leads nor a pipeline.'),
];

// Asks first, as a run changes many leads at once. Errors are caught: a
// thrown one would leave the button dead until the page reloads.
const AssignTeamLeads = () => {
  const [teamId] = useSelectedRecordIds();
  const { t } = useTranslate();

  const execute = async () => {
    if (teamId === undefined) {
      await enqueueSnackbar({ message: t('Open one team first.'), variant: 'error' });
      return;
    }
    try {
      const response = await postAppRoute<{ message?: string }>(ASSIGN_TEAM_LEADS_ROUTE_PATH, { teamId });

      await enqueueSnackbar({ message: response?.message || t('Leads assigned.'), variant: 'success' });
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t('The leads could not be assigned.')), variant: 'error' });
    }
  };

  return (
    <CommandModal
      title={t('Assign leads')}
      subtitle={t('Assign the unassigned leads of this team now? Each salesperson gets their full daily quota.')}
      confirmButtonText={t('Assign')}
      execute={execute}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamFrontComponent,
  name: 'crm-team-assign-leads',
  description: 'Asks to confirm, then assigns the team its unassigned leads.',
  isHeadless: true,
  component: AssignTeamLeads,
});
