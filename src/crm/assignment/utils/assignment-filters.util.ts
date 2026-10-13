import { WON_STATUS } from 'src/crm/crm-options.constant';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// Leads waiting for a team: pending, no team, no salesperson, created before
// the delay and, when a day window is set, inside it.
export const allocationCandidateFilter = ({
  teamFilter,
  now,
  delayHours,
  creationDeltaDays,
}: {
  teamFilter: Record<string, unknown> | null;
  now: Date;
  delayHours: number;
  creationDeltaDays: number;
}) => ({
  and: [
    ...(teamFilter === null ? [] : [teamFilter]),
    { createdAt: { lte: new Date(now.getTime() - delayHours * HOUR_MS).toISOString() } },
    { teamId: { is: 'NULL' } },
    { salespersonId: { is: 'NULL' } },
    { wonStatus: { eq: WON_STATUS.PENDING } },
    ...(creationDeltaDays > 0 ? [{ createdAt: { gt: new Date(now.getTime() - creationDeltaDays * DAY_MS).toISOString() } }] : []),
  ],
});

// Leads on the teams waiting for a salesperson, of any age, won ones too; a
// lost lead is out of the pipeline.
export const assignableLeadFilter = (teamIds: string[]) => ({
  and: [
    { salespersonId: { is: 'NULL' } },
    { dateOpen: { is: 'NULL' } },
    { teamId: { in: teamIds } },
    { or: [{ wonStatus: { neq: WON_STATUS.LOST } }, { wonStatus: { is: 'NULL' } }] },
  ],
});

// Leads a salesperson received in a team since a moment, lost ones included.
export const leadDayCountFilter = ({ teamIds, userIds, since }: { teamIds: string[]; userIds: string[]; since: Date }) => ({
  and: [{ dateOpen: { gte: since.toISOString() } }, { teamId: { in: teamIds } }, { salespersonId: { in: userIds } }],
});

export const withinIds = (filter: Record<string, unknown> | null, ids: string[]) =>
  filter === null ? { id: { in: ids } } : { and: [filter, { id: { in: ids } }] };
