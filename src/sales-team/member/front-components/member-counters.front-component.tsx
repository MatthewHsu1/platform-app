import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useRecordId, useTranslate } from 'twenty-sdk/front-component';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { countLeads, daysAgo } from 'src/sales-team/front-components/count-leads';

type Counts = { lastDay: number; lastMonth: number };

// Leads the member received in their team, whatever their status now.
const loadCounts = async (memberId: string): Promise<Counts> => {
  const { crmTeamMember } = await queryAsUser<{ crmTeamMember: { crmTeamId: string | null; salesUserId: string | null } | null }>(
    `query Member($id: UUID!) { crmTeamMember(filter: { id: { eq: $id } }) { crmTeamId salesUserId } }`,
    { id: memberId },
  );

  if (crmTeamMember?.crmTeamId == null || crmTeamMember.salesUserId === null) {
    return { lastDay: 0, lastMonth: 0 };
  }
  const own = { teamId: { eq: crmTeamMember.crmTeamId }, salespersonId: { eq: crmTeamMember.salesUserId } };
  const counts = await countLeads({
    lastDay: { ...own, dateOpen: { gte: daysAgo(1) } },
    lastMonth: { ...own, dateOpen: { gte: daysAgo(30) } },
  });

  return counts;
};

const MemberCounters = () => {
  const { t } = useTranslate();
  const memberId = useRecordId();
  const styles = readPopUpStyles();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberId === null) {
      return;
    }
    loadCounts(memberId).then(setCounts, (caught: unknown) => setError(describeRouteError(caught, t('Could not count the leads.'))));
  }, [memberId, t]);

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      {counts === null ? null : (
        <>
          <span>{t('Leads in the last 24 hours: {count}', { count: counts.lastDay })}</span>
          <span>{t('Leads in the last 30 days: {count}', { count: counts.lastMonth })}</span>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CRM_SCREEN_IDS.memberCounters,
  name: 'sales-team-member-counters',
  description: 'Leads the member received in the last 24 hours and in the last 30 days.',
  component: MemberCounters,
});
