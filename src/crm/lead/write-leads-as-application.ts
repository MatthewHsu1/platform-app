import { TWENTY_APP_LEAD_WRITE_API } from 'src/crm/lead/twenty-lead-api';
import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type AppLeadWriteApi } from 'src/crm/lead/types/app-lead-write-api.type';
import { type LeadPersonPush } from 'src/crm/lead/types/lead-person-push.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { planLeadWrite } from 'src/crm/lead/utils/plan-lead-write.util';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { MUTATION_MAXIMUM_RECORDS } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';
import { groupBy } from 'src/shared/utils/group-by.util';

type PlannedWrite = {
  leadId: string;
  payload: Record<string, unknown>;
  guard?: Record<string, unknown>;
  push: LeadPersonPush | null;
  move: { lead: LeadRow; moves: StatusMoves } | null;
};

// An error names the first few leads only: a batch may hold a hundred.
const LABEL_IDS = 5;

export const leadIdsLabel = (ids: string[]) =>
  ids.length <= LABEL_IDS ? ids.join(', ') : `${ids.slice(0, LABEL_IDS).join(', ')} and ${ids.length - LABEL_IDS} more`;

// Each write with the save rules applied: the values to write, and the
// contact push and status moves to make once it is written. A lead that is
// gone, or whose write the rules refuse, is skipped.
const planWrites = async (api: AppLeadWriteApi, writes: AppLeadWrite[], options: { now?: string; rescore?: boolean }) => {
  const now = options.now ?? api.now();
  const leads = await api.readLeads([...new Set(writes.map((write) => write.leadId))]);
  const byId = new Map(leads.map((lead) => [lead.id, lead]));
  const context = await api.loadContext(leads);
  const planned: PlannedWrite[] = [];
  const skipped: string[] = [];

  const planFor = (lead: LeadRow, data: Record<string, unknown>) =>
    planLeadWrite({
      operation: 'updated',
      before: lead,
      after: { ...lead, ...data } as LeadRow,
      written: new Set(Object.keys(data)),
      applySaveRules: true,
      now,
      context,
      creatorMemberId: null,
      rescore: options.rescore,
    });

  for (const write of writes) {
    const lead = byId.get(write.leadId);

    if (lead === undefined) {
      skipped.push(write.leadId);
      continue;
    }
    let data = write.data;
    let plan = planFor(lead, data);

    // A probability moved by a rescore the app asked for is written as a
    // probability: the closed date and the won and lost counts follow it.
    if (options.rescore === true && plan.kind === 'write' && !('probability' in data) && typeof plan.data.probability === 'number') {
      data = { ...data, probability: plan.data.probability };
      plan = planFor(lead, data);
    }
    if (plan.kind === 'refuse') {
      skipped.push(write.leadId);
      continue;
    }
    const after = { ...lead, ...data } as LeadRow;

    planned.push({
      leadId: write.leadId,
      payload: { ...data, ...plan.data },
      guard: write.guard,
      push: plan.personPush === null ? null : { leadId: write.leadId, push: plan.personPush, locale: null },
      move:
        plan.statusMoves.won !== 0 || plan.statusMoves.lost !== 0
          ? { lead: { ...after, ...plan.data } as LeadRow, moves: plan.statusMoves }
          : null,
    });
  }

  return { planned, skipped };
};

const finishWritten = async (api: AppLeadWriteApi, written: PlannedWrite[], errors: ReturnType<typeof errorCollector>) => {
  const pushes = written.flatMap((write) => (write.push === null ? [] : [write.push]));
  const moves = written.flatMap((write) => (write.move === null ? [] : [write.move]));

  if (pushes.length > 0) {
    await errors.run('contacts', () => api.pushPeople(pushes));
  }
  if (moves.length > 0) {
    await errors.run('scoring counts', () => api.applyStatusMoves(moves));
  }
};

// Platform's own lead writes carry the save rules themselves, because the
// lead trigger gives app writes the computes only.
export const makeWriteLeadsAsApplication =
  (api: AppLeadWriteApi) =>
  async (writes: AppLeadWrite[], options: { now?: string; rescore?: boolean } = {}) => {
    const { planned, skipped } = await planWrites(api, writes, options);
    const written: string[] = [];
    const toWrite = planned.filter((write) => {
      if (Object.keys(write.payload).length === 0) {
        written.push(write.leadId);
        return false;
      }
      return true;
    });
    // A group that fails does not stop the others, and the status moves of
    // every lead written are counted before the failure is reported.
    const errors = errorCollector();

    // Guarded writes with the same values and guard go in one request; a lead
    // the request does not reach was changed by another writer first.
    const guarded = toWrite.filter((write) => write.guard !== undefined);

    for (const group of groupBy(guarded, (write) => JSON.stringify([write.payload, write.guard])).values()) {
      for (const part of chunks(group, MUTATION_MAXIMUM_RECORDS)) {
        const ids = part.map((write) => write.leadId);

        await errors.run(`Update leads ${leadIdsLabel(ids)}`, async () => {
          const reached = new Set(await api.updateLeadWhere({ id: { in: ids }, ...part[0].guard }, part[0].payload));

          ids.forEach((id) => (reached.has(id) ? written : skipped).push(id));
        });
      }
    }

    const unguarded = toWrite.filter((write) => write.guard === undefined);

    for (const group of groupBy(unguarded, (write) => JSON.stringify(write.payload)).values()) {
      for (const part of chunks(group, MUTATION_MAXIMUM_RECORDS)) {
        const ids = part.map((write) => write.leadId);

        await errors.run(`Update leads ${leadIdsLabel(ids)}`, async () => {
          await api.updateLeads(ids, part[0].payload);
          written.push(...ids);
        });
      }
    }
    const writtenIds = new Set(written);

    await finishWritten(
      api,
      planned.filter((write) => writtenIds.has(write.leadId)),
      errors,
    );
    errors.throwIfAny();

    return { written, skipped };
  };

// A write made with the caller's own token, so Twenty checks their update
// right and row rule, that still carries the save rules: for a caller the lead
// trigger would treat as the app, such as an API key. A refusal of the write
// comes back as Twenty's error and nothing is counted. Returns false for a
// lead that is gone or whose write the rules refuse.
export const makeWriteLeadAsCaller =
  (api: AppLeadWriteApi) =>
  async (leadId: string, data: Record<string, unknown>, updateAsCaller: (leadId: string, payload: Record<string, unknown>) => Promise<void>) => {
    const { planned } = await planWrites(api, [{ leadId, data }], {});
    const [write] = planned;

    if (write === undefined) {
      return false;
    }
    if (Object.keys(write.payload).length > 0) {
      await updateAsCaller(leadId, write.payload);
    }
    const errors = errorCollector();

    await finishWritten(api, [write], errors);
    errors.throwIfAny();
    return true;
  };

export const writeLeadsAsApplication = makeWriteLeadsAsApplication(TWENTY_APP_LEAD_WRITE_API);

export const writeLeadAsCaller = makeWriteLeadAsCaller(TWENTY_APP_LEAD_WRITE_API);
