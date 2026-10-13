import { describe, expect, it } from 'vitest';

import { makeSlaEngine } from 'src/helpdesk-sla/sla-engine';
import { type SlaApi } from 'src/helpdesk-sla/types/sla-api.type';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';
import { T0, h, policy } from 'src/helpdesk-sla/utils/__tests__/sla-fixtures';

const ROUND_THE_CLOCK = {
  calendar: { id: 'cal', name: '24x7', tz: 'UTC', hoursPerDay: 24, twoWeeksCalendar: false, active: true },
  attendances: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => ({
    id: `a${day}`,
    calendarId: 'cal',
    name: day,
    dayofweek: day,
    hourFrom: 0,
    hourTo: 24,
    dayPeriod: 'MORNING',
    weekType: null,
    sequence: 10,
  })),
  leaves: [],
};

const fakeApi = (options: { useSla?: boolean; calendarId?: string | null; rows?: SlaRow[]; stageId?: string } = {}) => {
  let rows: SlaRow[] = options.rows ?? [];
  const summaries: Record<string, unknown>[] = [];
  let claimed = 0;
  const api: SlaApi = {
    readCases: async () => [
      { id: 'case1', createdAt: T0, teamId: 'team1', categoryId: null, tagIds: [], stageId: options.stageId ?? 'new', filterRecord: {} },
    ],
    readTeams: async () => [
      { id: 'team1', useSla: options.useSla ?? true, resourceCalendarId: options.calendarId === undefined ? 'cal' : options.calendarId },
    ],
    readPolicies: async () => [policy()],
    readStageSequences: async () =>
      new Map([
        ['new', 1],
        ['two', 10],
      ]),
    readRows: async () => rows,
    loadCalendars: async (ids) => new Map(ids.includes('cal') ? [['cal', ROUND_THE_CLOCK]] : []),
    createRows: async (created) => {
      rows = [...rows, ...created.map((item, index) => ({ ...item, id: `new${rows.length + index}` }))];
    },
    destroyRows: async (ids) => {
      rows = rows.filter((item) => !ids.includes(item.id));
    },
    updateRow: async (id, data) => {
      rows = rows.map((item) => (item.id === id ? { ...item, ...data } : item));
    },
    writeCaseSummary: async (_caseId, data) => {
      summaries.push(data);
    },
    withCaseClaim: async (_caseId, run) => {
      claimed += 1;

      return run();
    },
  };

  return { api, rows: () => rows, summaries, claims: () => claimed };
};

const OLD_ROW: SlaRow = {
  id: 'old',
  ticketId: 'case1',
  slaId: 'generic',
  name: 'Generic SLA',
  deadline: h(2),
  hours: 2,
  expectedStageId: 'two',
  consumedTime: 0,
  lastStateDate: T0,
  state: 'IN_PROGRESS',
};

describe('SLA engine', () => {
  it('attaches the matching policies to a new case of a team that uses SLA, under the case claim', async () => {
    const fake = fakeApi();

    await makeSlaEngine(fake.api).attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'replace' });

    expect(fake.rows()).toMatchObject([{ slaId: 'generic', state: 'IN_PROGRESS', deadline: h(2), lastStateDate: T0 }]);
    expect(fake.claims()).toBe(1);
  });

  it('removes old rows and attaches nothing when the team does not use SLA', async () => {
    const fake = fakeApi({ useSla: false, rows: [OLD_ROW] });

    await makeSlaEngine(fake.api).attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'replace' });

    expect(fake.rows()).toEqual([]);
  });

  it('attaches on the first save that sets the team and leaves a case that already has rows alone', async () => {
    const withoutRows = fakeApi();
    const withRows = fakeApi({ rows: [OLD_ROW] });

    await makeSlaEngine(withoutRows.api).attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'whenEmpty' });
    await makeSlaEngine(withRows.api).attachSlas(['case1'], { now: h(5), onlyWhenTeamUsesSla: true, mode: 'whenEmpty' });

    expect(withoutRows.rows()).toHaveLength(1);
    expect(withRows.rows()).toEqual([OLD_ROW]);
  });

  it('a second refresh finds the row and adds nothing', async () => {
    const fake = fakeApi();
    const engine = makeSlaEngine(fake.api);

    await engine.attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: false, mode: 'refresh' });
    const first = fake.rows();
    await engine.attachSlas(['case1'], { now: h(5), onlyWhenTeamUsesSla: false, mode: 'refresh' });

    expect(fake.rows()).toEqual(first);
  });

  it('a stage save that waited for the claim plans from the row the first one wrote', async () => {
    const fake = fakeApi();
    const engine = makeSlaEngine(fake.api);

    await engine.attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'replace' });
    await engine.recomputeSlaRows(
      [
        { caseId: 'case1', stageId: 'new' },
        { caseId: 'case1', stageId: 'two' },
      ],
      h(1),
    );

    expect(fake.rows()).toMatchObject([{ state: 'ACCOMPLISHED', consumedTime: 1, lastStateDate: h(1) }]);
  });

  it('a team without working hours still gets its rows, with no deadline, and a warning', async () => {
    const fake = fakeApi({ calendarId: null });

    const warnings = await makeSlaEngine(fake.api).attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'replace' });

    expect(fake.rows()).toMatchObject([{ hours: 2, deadline: null }]);
    expect(warnings).toHaveLength(1);
  });

  it('keeps the case summary in step with its rows', async () => {
    const fake = fakeApi();
    const engine = makeSlaEngine(fake.api);

    await engine.attachSlas(['case1'], { now: T0, onlyWhenTeamUsesSla: true, mode: 'replace' });
    await engine.refreshCaseSlaSummary(['case1']);

    expect(fake.summaries[fake.summaries.length - 1]).toEqual({ slaDeadline: h(2), slaStateExpired: false });
  });
});
