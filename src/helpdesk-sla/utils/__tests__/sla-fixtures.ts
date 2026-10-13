import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';

const HOUR = 3_600_000;

export const T0 = '2026-01-05T09:00:00.000Z';
export const h = (hours: number) => new Date(Date.parse(T0) + hours * HOUR).toISOString();

// Stage steps: the first stage and "one" share step 1; "two" is the target of the generic policy.
const SEQUENCES: Record<string, number> = { new: 1, one: 1, oneOne: 5, oneTwo: 6, two: 10, three: 20 };

export const stageSequence = (stageId: string | null) => (stageId === null ? 0 : (SEQUENCES[stageId] ?? 0));

// A calendar that works round the clock: planning adds hours, counting takes the difference.
export const roundTheClock = {
  plan: (hours: number, from: string) => new Date(Date.parse(from) + hours * HOUR).toISOString(),
  workHours: (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / HOUR,
};

export const policy = (extra: Partial<SlaPolicy> = {}): SlaPolicy => ({
  id: 'generic',
  name: 'Generic SLA',
  active: true,
  stageId: 'two',
  days: 0,
  hours: 2,
  domain: null,
  teamIds: [],
  categoryIds: [],
  tagIds: [],
  ignoreStageIds: [],
  ...extra,
});

export const row = (extra: Partial<SlaRow> = {}): SlaRow => ({
  id: 'row1',
  ticketId: 'case1',
  slaId: 'generic',
  name: 'Generic SLA',
  deadline: h(2),
  hours: 2,
  expectedStageId: 'two',
  consumedTime: 0,
  lastStateDate: T0,
  state: 'IN_PROGRESS',
  ...extra,
});
