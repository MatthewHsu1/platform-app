import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { roundRobin } from 'src/crm/lead/actions/utils/round-robin.util';
import { type Allocation } from 'src/crm/lead/actions/utils/types/allocation.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { findStage } from 'src/crm/lead/utils/find-stage.util';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { defaultTeam } from 'src/sales-team/team/utils/default-team.util';

// Lost and won leads are not converted. An opportunity keeps its conversion
// date. A lead with no stage gets the first stage of its own team, folded
// stages included.
export const planConversion = ({
  lead,
  customer,
  stages,
  now,
}: {
  lead: LeadRow;
  customer: { personId: string | null; companyId: string | null };
  stages: StageRow[];
  now: string;
}): Record<string, unknown> => {
  if (lead.wonStatus === WON_STATUS.LOST || lead.wonStatus === WON_STATUS.WON) {
    return {};
  }

  const data: Record<string, unknown> = {};

  if (lead.leadType !== LEAD_TYPE.OPPORTUNITY) {
    data.leadType = LEAD_TYPE.OPPORTUNITY;
    data.dateConversion = now;
  }
  if (customer.personId !== lead.personId) {
    data.personId = customer.personId;
  }
  if (customer.companyId !== lead.companyId) {
    data.companyId = customer.companyId;
  }
  if (lead.stageId === null) {
    data.stageId = findStage({ stages, teamId: lead.teamId, foldFilter: false, limit: 'first' })[0]?.id ?? null;
  }

  return data;
};

// Salespersons in turn over the leads not lost (without force, only those with
// no salesperson); a team alone goes on all of them. No salesperson chosen
// never clears one.
export const planAllocation = ({
  leads,
  salespersonIds,
  teamId,
  force,
}: {
  leads: LeadRow[];
  salespersonIds: string[];
  teamId: string | null;
  force: boolean;
}) => {
  const allocated = new Map<string, Allocation>();
  const candidates = leads.filter((lead) => lead.wonStatus !== WON_STATUS.LOST && (force || lead.salespersonId === null));

  if (salespersonIds.length > 0) {
    for (const { item, salespersonId } of roundRobin(candidates, salespersonIds)) {
      allocated.set(item.id, teamId === null ? { salespersonId } : { salespersonId, teamId });
    }
  } else if (teamId !== null) {
    for (const lead of candidates) {
      allocated.set(lead.id, { teamId });
    }
  }

  return allocated;
};

// The conversion and the assignment go in one save. In two saves, the lead
// rules of the first one can run late and give the lead the old salesperson's
// team after the chosen team is written. The stage the conversion gives a lead
// without one stays when it is open to the team the lead ends in (the chosen
// one, else the one the team rule gives the salesperson); otherwise the lead
// takes the first open stage of that team.
export const planConvertSave = ({
  lead,
  conversion,
  allocated,
  stages,
  teams,
  memberships,
}: {
  lead: LeadRow;
  conversion: Record<string, unknown>;
  allocated: Allocation | undefined;
  stages: StageRow[];
  teams: TeamRow[];
  memberships: MembershipRow[];
}): Record<string, unknown> => {
  if (allocated === undefined || conversion.stageId === undefined) {
    return { ...conversion, ...allocated };
  }

  const salespersonId = allocated.salespersonId ?? lead.salespersonId;
  const leadType = (conversion.leadType as string | undefined) ?? lead.leadType;
  const teamFollows = salespersonId !== lead.salespersonId || leadType !== lead.leadType;
  const teamId =
    allocated.teamId ??
    (teamFollows ? defaultTeam({ salespersonId, leadType, currentTeamId: lead.teamId, useTypeFilter: true, teams, memberships }) : lead.teamId);
  const stage = stages.find((row) => row.id === conversion.stageId);
  const openToTeam = stage === undefined || stage.teamIds.length === 0 || (teamId !== null && stage.teamIds.includes(teamId));
  const stageId = openToTeam ? conversion.stageId : (findStage({ stages, teamId, foldFilter: true, limit: 'first' })[0]?.id ?? null);

  return { ...conversion, stageId, ...allocated };
};
