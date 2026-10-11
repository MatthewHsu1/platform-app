import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { defaultTeam } from 'src/sales-team/team/utils/default-team.util';

// Runs on create and when the salesperson or the type changes. A team the
// save itself wrote stays as written.
export const planTeamDefault = ({
  operation,
  before,
  lead,
  written,
  context,
}: {
  operation: 'created' | 'updated' | 'restored';
  before: LeadRow | null;
  lead: LeadRow;
  written: ReadonlySet<string>;
  context: LeadContext;
}): Partial<LeadRow> => {
  if (written.has('teamId')) {
    return {};
  }

  const fires =
    operation === 'created' || (before !== null && (before.salespersonId !== lead.salespersonId || before.leadType !== lead.leadType));

  if (!fires) {
    return {};
  }

  const teamId = defaultTeam({
    salespersonId: lead.salespersonId,
    leadType: lead.leadType,
    currentTeamId: lead.teamId,
    useTypeFilter: true,
    teams: context.teams,
    memberships: context.memberships,
  });

  return teamId === lead.teamId ? {} : { teamId };
};
