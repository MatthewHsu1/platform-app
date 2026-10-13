import { NO_NUMBER } from 'src/helpdesk/helpdesk-options.constant';
import { type CaseApi } from 'src/helpdesk/ticket/types/case-api.type';
import { type CaseEvent } from 'src/helpdesk/ticket/types/case-event.type';
import { type CaseEventsResult } from 'src/helpdesk/ticket/types/case-events-result.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { planCaseCreate } from 'src/helpdesk/utils/plan-case-create.util';
import { planCaseUpdate, writtenCaseFields } from 'src/helpdesk/utils/plan-case-update.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { sameValue } from 'src/shared/utils/same-value.util';

// A change to one of these moves a case in or out of its team's open counts.
const COUNTED_FIELDS = ['teamId', 'assignedUserId', 'stageId', 'priority', 'active', 'unattended'] as const;

const emptyResult = (): CaseEventsResult => ({ written: [], stageSaved: [], teamsToCount: [], teamSet: [], created: [] });

export const applyCaseCreates = async (events: CaseEvent[], api: CaseApi, now: string): Promise<CaseEventsResult> => {
  const fresh = await api.readCases(events.map((item) => item.recordId));
  const byId = new Map(fresh.map((row) => [row.id, row]));
  const context = await api.loadContext(fresh);
  const result = emptyResult();

  for (const item of events) {
    const current = byId.get(item.recordId);

    if (current === undefined) {
      continue;
    }
    const plan = planCaseCreate({ after: current, creatorMemberId: item.workspaceMemberId, context, now });
    const data: Partial<CaseRow> = { ...plan.data };

    if (plan.needsNumber) {
      const number = (await api.takeNumber()) ?? NO_NUMBER;

      if (number !== current.number) {
        data.number = number;
      }
    }
    if (Object.keys(data).length > 0) {
      await api.writeCase(current.id, data);
      result.written.push(current.id);
    }
    result.created.push(current.id);
    const teamId = data.teamId !== undefined ? data.teamId : current.teamId;

    if (teamId !== null) {
      result.teamsToCount.push(teamId);
    }
  }
  result.teamsToCount = [...new Set(result.teamsToCount)];

  return result;
};

export const applyCaseUpdates = async (events: CaseEvent[], api: CaseApi, now: string): Promise<CaseEventsResult> => {
  const ids = [...new Set(events.map((item) => item.recordId))];
  const fresh = await api.readCases(ids);
  const byId = new Map(fresh.map((row) => [row.id, row]));
  const context = await api.loadContext(fresh);
  const result = emptyResult();

  for (const id of ids) {
    const current = byId.get(id);
    const caseEvents = events.filter((item) => item.recordId === id && item.before !== null);

    if (current === undefined || caseEvents.length === 0) {
      continue;
    }
    let pending: Partial<CaseRow> = {};

    // Each save is planned on the row as it stood after that save plus what the earlier saves of the batch
    // still owe; a field a later save wrote itself is never replaced by an earlier plan.
    for (const item of caseEvents) {
      const written = writtenCaseFields(item.updatedFields);

      pending = Object.fromEntries(
        Object.entries(pending).filter(([field]) => !written.has(field) && !written.has(field.replace(/Id$/, ''))),
      ) as Partial<CaseRow>;
      const plan = planCaseUpdate({
        before: item.before as CaseRow,
        after: { ...item.after, ...pending },
        written,
        applySaveRules: !isApplicationWrite(item.after),
        context,
        now,
      });

      pending = { ...pending, ...plan.data };
      if (item.after.teamId !== null && item.before?.teamId !== item.after.teamId && !result.teamSet.includes(id)) {
        result.teamSet.push(id);
      }
      if (plan.stageSaved) {
        result.stageSaved.push({ caseId: id, stageId: item.after.stageId });
      }
      if (COUNTED_FIELDS.some((field) => !sameValue(item.before?.[field], item.after[field]) || field in plan.data)) {
        for (const teamId of [item.before?.teamId ?? null, item.after.teamId, pending.teamId ?? null]) {
          if (teamId !== null && teamId !== undefined) {
            result.teamsToCount.push(teamId);
          }
        }
      }
    }

    const last = caseEvents[caseEvents.length - 1].after;
    // A newer save this batch has not seen owns the fields it changed.
    const data = Object.fromEntries(
      Object.entries(pending).filter(
        ([field, value]) =>
          sameValue(current[field as keyof CaseRow], last[field as keyof CaseRow]) && !sameValue(current[field as keyof CaseRow], value),
      ),
    ) as Partial<CaseRow>;

    if (Object.keys(data).length > 0) {
      await api.writeCase(id, data);
      result.written.push(id);
    }
  }
  result.teamsToCount = [...new Set(result.teamsToCount)];

  return result;
};
