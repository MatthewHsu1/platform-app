import { type SlaCase } from 'src/helpdesk-sla/types/sla-case.type';
import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';
import { type CalendarData } from 'src/resource/types/calendar-data.type';

// What the service level engine needs from Twenty, so tests run it against a fake.
export type SlaApi = {
  readCases: (ids: string[]) => Promise<SlaCase[]>;
  readTeams: (ids: string[]) => Promise<{ id: string; useSla: boolean; resourceCalendarId: string | null }[]>;
  // Every policy with its four lists, archived ones too (the matching rule leaves them out).
  readPolicies: () => Promise<SlaPolicy[]>;
  readStageSequences: () => Promise<Map<string, number>>;
  // The rows of these cases that are not in the trash.
  readRows: (caseIds: string[]) => Promise<SlaRow[]>;
  loadCalendars: (calendarIds: string[]) => Promise<Map<string, CalendarData>>;
  createRows: (rows: Omit<SlaRow, 'id'>[]) => Promise<void>;
  destroyRows: (ids: string[]) => Promise<void>;
  updateRow: (id: string, data: Partial<SlaRow>) => Promise<void>;
  // Writes only what differs from the stored case.
  writeCaseSummary: (caseId: string, data: { slaDeadline: string | null; slaStateExpired: boolean }) => Promise<void>;
  // One writer of a case's rows at a time: a writer that finds the claim held waits and tries again.
  withCaseClaim: <TResult>(caseId: string, run: () => Promise<TResult>) => Promise<TResult>;
};
