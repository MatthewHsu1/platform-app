import { type AssignLeadsInput } from 'src/crm/assignment/types/assign-leads-input.type';
import { type AssignmentApi } from 'src/crm/assignment/types/assignment-api.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { assignmentQuota } from 'src/crm/assignment/utils/assignment-quota.util';

const DAY_MS = 86_400_000;

// The daily quota of each member; a scheduled run takes away what each
// received in its team in the last 24 hours, whoever assigned it.
export const readQuotas = async (api: AssignmentApi, input: AssignLeadsInput, now: Date, members: AssignmentMembership[]) => {
  const dayCounts =
    input.forceQuota || members.length === 0
      ? new Map<string, number>()
      : await api.countLeadDays({
          teamIds: [...new Set(members.map((member) => member.teamId))],
          userIds: [...new Set(members.map((member) => member.userId))],
          since: new Date(now.getTime() - DAY_MS),
        });
  const quotas = new Map(
    members.map((member) => [
      member.id,
      assignmentQuota({
        assignmentMax: member.assignmentMax,
        forceQuota: input.forceQuota,
        leadDayCount: dayCounts.get(`${member.userId}|${member.teamId}`) ?? 0,
      }),
    ]),
  );

  return { dayCounts, quotas };
};
