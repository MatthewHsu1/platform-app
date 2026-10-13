import { type AssignmentPlugRequest } from 'src/crm/assignment/plug/types/assignment-plug-request.type';
import { type AssignLeadsInput } from 'src/crm/assignment/types/assign-leads-input.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { parseStoredFilter } from 'src/shared/filter-editor/stored-filter';

// A stored filter as the plugin reads it: parsed, or null when empty or unreadable.
const parsedFilter = (text: string | null): unknown => parseStoredFilter(text).value;

// Everything a plugin needs to decide, and nothing more: the run, its teams,
// their active members with the quotas Platform computed, and the leads
// waiting for a team or a salesperson.
export const buildAssignmentRequest = ({
  input,
  now,
  delayHours,
  teams,
  members,
  quotas,
  dayCounts,
  leads,
}: {
  input: AssignLeadsInput;
  now: Date;
  delayHours: number;
  teams: TeamRow[];
  members: AssignmentMembership[];
  quotas: ReadonlyMap<string, number>;
  dayCounts: ReadonlyMap<string, number>;
  leads: LeadRow[];
}): AssignmentPlugRequest => ({
  run: { door: input.door, forceQuota: input.forceQuota, creationDeltaDays: input.creationDeltaDays, delayHours, now: now.toISOString() },
  teams: teams.map((team) => ({
    id: team.id,
    name: team.name,
    sequence: team.sequence,
    useLeads: team.useLeads,
    useOpportunities: team.useOpportunities,
    assignmentOptout: team.assignmentOptout,
    assignmentMax: team.assignmentMax,
    assignmentDomain: parsedFilter(team.assignmentDomain),
  })),
  members: members.map((member) => ({
    id: member.id,
    teamId: member.teamId,
    workspaceMemberId: member.userId,
    name: member.name,
    assignmentOptout: member.assignmentOptout,
    assignmentMax: member.assignmentMax,
    quota: quotas.get(member.id) ?? 0,
    leadDayCount: dayCounts.get(`${member.userId}|${member.teamId}`) ?? 0,
    assignmentDomain: parsedFilter(member.assignmentDomain),
    assignmentDomainPreferred: parsedFilter(member.assignmentDomainPreferred),
  })),
  leads: leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    createdAt: lead.createdAt,
    leadType: lead.leadType,
    wonStatus: lead.wonStatus,
    priority: lead.priority,
    probability: lead.probability,
    teamId: lead.teamId,
    salespersonId: lead.salespersonId,
    dateOpen: lead.dateOpen,
    stageId: lead.stageId,
    email: lead.emailFrom?.primaryEmail ?? null,
    phone: lead.phone ? { callingCode: lead.phone.primaryPhoneCallingCode, number: lead.phone.primaryPhoneNumber } : null,
    contactName: lead.contactName,
    partnerName: lead.partnerName,
    personId: lead.personId,
    companyId: lead.companyId,
    sourceId: lead.sourceId,
    mediumId: lead.mediumId,
    campaignId: lead.campaignId,
    tags: lead.tags ?? [],
    language: lead.language,
    address: {
      street1: lead.contactAddress?.addressStreet1 ?? null,
      street2: lead.contactAddress?.addressStreet2 ?? null,
      city: lead.contactAddress?.addressCity ?? null,
      postcode: lead.contactAddress?.addressPostcode ?? null,
      state: lead.contactAddress?.addressState ?? null,
      country: lead.contactAddress?.addressCountry ?? null,
    },
    expectedRevenue: lead.expectedRevenue,
    referred: lead.referred,
    dateDeadline: lead.dateDeadline,
  })),
});
