import { useEffect, useState } from 'react';

import { type SalesChoice } from 'src/crm/lead/actions/components/types/sales-choice.type';
import { memberName } from 'src/sales-team/member/utils/member-name.util';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readWorkspaceMembers } from 'src/shared/front-components/read-workspace-members';

// Workspace members and active teams for the dialog selects, read as the user.
export const useSalesChoices = () => {
  const [members, setMembers] = useState<SalesChoice[]>([]);
  const [teams, setTeams] = useState<SalesChoice[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      readWorkspaceMembers(),
      queryAsUser<{ crmTeams: { edges: { node: { id: string; name: string | null } }[] } }>(
        `{ crmTeams(filter: { active: { eq: true } }, orderBy: [{ sequence: AscNullsLast }, { createdAt: DescNullsLast }], first: 200) {
          edges { node { id name } }
        } }`,
      ),
    ])
      .then(([memberRows, teamData]) => {
        setMembers(memberRows.map((member) => ({ id: member.id, label: memberName(member.name) ?? '' })));
        setTeams(teamData.crmTeams.edges.map(({ node }) => ({ id: node.id, label: node.name ?? '' })));
      })
      .catch(() => setFailed(true));
  }, []);

  return { members, teams, failed };
};
