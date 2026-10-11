import { TWENTY_APP_LEAD_WRITE_API } from 'src/crm/lead/twenty-lead-api';
import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type AppLeadWriteApi } from 'src/crm/lead/types/app-lead-write-api.type';
import { type LeadPersonPush } from 'src/crm/lead/types/lead-person-push.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { planLeadWrite } from 'src/crm/lead/utils/plan-lead-write.util';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { groupBy } from 'src/shared/utils/group-by.util';

// Platform's own lead writes carry the save rules themselves, because the
// lead trigger gives app writes the computes only.
export const makeWriteLeadsAsApplication =
  (api: AppLeadWriteApi) =>
  async (writes: AppLeadWrite[], options: { now?: string; rescore?: boolean } = {}) => {
    const now = options.now ?? api.now();
    const leads = await api.readLeads([...new Set(writes.map((write) => write.leadId))]);
    const byId = new Map(leads.map((lead) => [lead.id, lead]));
    const context = await api.loadContext(leads);
    const written: string[] = [];
    const skipped: string[] = [];
    const unguarded: { id: string; data: Record<string, unknown> }[] = [];
    const movesOf = new Map<string, { lead: LeadRow; moves: StatusMoves }>();
    const pushOf = new Map<string, LeadPersonPush>();

    for (const write of writes) {
      const lead = byId.get(write.leadId);

      if (lead === undefined) {
        skipped.push(write.leadId);
        continue;
      }
      const after = { ...lead, ...write.data } as LeadRow;
      const plan = planLeadWrite({
        operation: 'updated',
        before: lead,
        after,
        written: new Set(Object.keys(write.data)),
        applySaveRules: true,
        now,
        context,
        creatorMemberId: null,
        rescore: options.rescore,
      });

      if (plan.kind === 'refuse') {
        skipped.push(write.leadId);
        continue;
      }
      const payload = { ...write.data, ...plan.data };

      if (Object.keys(payload).length === 0) {
        written.push(write.leadId);
        continue;
      }
      if (plan.personPush !== null) {
        pushOf.set(write.leadId, { leadId: write.leadId, push: plan.personPush, locale: null });
      }
      if (plan.statusMoves.won !== 0 || plan.statusMoves.lost !== 0) {
        movesOf.set(write.leadId, { lead: { ...after, ...plan.data } as LeadRow, moves: plan.statusMoves });
      }
      if (write.guard === undefined) {
        unguarded.push({ id: write.leadId, data: payload });
        continue;
      }
      const reached = await api.updateLeadWhere({ id: { eq: write.leadId }, ...write.guard }, payload);

      (reached.length === 0 ? skipped : written).push(write.leadId);
    }

    // A group that fails does not stop the others, and the status moves of
    // every lead written are counted before the failure is reported.
    const errors = errorCollector();

    for (const group of groupBy(unguarded, (update) => JSON.stringify(update.data)).values()) {
      const ids = group.map((update) => update.id);

      await errors.run(`Update leads ${ids.join(', ')}`, async () => {
        await api.updateLeads(ids, group[0].data);
        written.push(...ids);
      });
    }
    const moves = written.flatMap((id) => {
      const move = movesOf.get(id);

      return move === undefined ? [] : [move];
    });

    const pushes = written.flatMap((id) => {
      const push = pushOf.get(id);

      return push === undefined ? [] : [push];
    });

    if (pushes.length > 0) {
      await errors.run('contacts', () => api.pushPeople(pushes));
    }
    if (moves.length > 0) {
      await errors.run('scoring counts', () => api.applyStatusMoves(moves));
    }
    errors.throwIfAny();

    return { written, skipped };
  };

export const writeLeadsAsApplication = makeWriteLeadsAsApplication(TWENTY_APP_LEAD_WRITE_API);
