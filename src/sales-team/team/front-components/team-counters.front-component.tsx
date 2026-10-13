import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { countLeads, daysAgo } from 'src/sales-team/front-components/count-leads';

type Counts = { unassigned: number; assigned: number; capacity: number };

type TeamRead = {
  crmTeam: { assignmentMax: number | null; members: { edges: { node: { salesUserId: string | null; active: boolean } }[] } } | null;
};

// Leads without a salesperson that are not lost, and the leads given to the
// team's active members in the last 30 days against the team's capacity.
const loadCounts = async (teamId: string): Promise<Counts> => {
  const { crmTeam } = await queryAsUser<TeamRead>(
    `query Team($id: UUID!) {
      crmTeam(filter: { id: { eq: $id } }) { assignmentMax members(first: 200) { edges { node { salesUserId active } } } }
    }`,
    { id: teamId },
  );
  const memberIds = (crmTeam?.members.edges ?? []).flatMap(({ node }) => (node.active && node.salesUserId !== null ? [node.salesUserId] : []));
  const counts = await countLeads({
    unassigned: { teamId: { eq: teamId }, salespersonId: { is: 'NULL' }, not: { wonStatus: { in: [WON_STATUS.LOST] } } },
    assigned:
      memberIds.length === 0
        ? { id: { is: 'NULL' } }
        : { teamId: { eq: teamId }, salespersonId: { in: memberIds }, dateOpen: { gte: daysAgo(30) } },
  });

  return { unassigned: counts.unassigned, assigned: counts.assigned, capacity: crmTeam?.assignmentMax ?? 0 };
};

const TeamCounters = () => {
  const { t } = useTranslate();
  const teamId = useRecordId();
  const styles = readPopUpStyles();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId === null) {
      return;
    }
    loadCounts(teamId).then(setCounts, (caught: unknown) => setError(describeRouteError(caught, t('Could not count the leads.'))));
  }, [teamId, t]);

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      {counts === null ? null : (
        <>
          <span>{t('Unassigned leads: {count}', { count: counts.unassigned })}</span>
          <span style={counts.assigned > counts.capacity ? { color: themeCssVariables.color.red } : undefined}>
            {t('Assigned in the last 30 days: {count} of {capacity}', { count: counts.assigned, capacity: counts.capacity })}
          </span>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CRM_SCREEN_IDS.teamCounters,
  name: 'sales-team-counters',
  description: 'Unassigned leads of the team, and leads assigned in the last 30 days against its capacity.',
  component: TeamCounters,
});
