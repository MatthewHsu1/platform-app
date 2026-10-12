import { type FilterCheck } from 'src/crm/assignment/types/filter-check.type';
import { type FilterUndo } from 'src/crm/assignment/types/filter-undo.type';

// A filter that cannot run is refused like every other save: a created row is
// removed, an updated row gets the filters it had before. One row is undone
// once, whichever of its filters failed.
export const planFilterUndo = (failed: { check: FilterCheck; reason: string }[]): FilterUndo => {
  const plan: FilterUndo = { destroy: [], putBack: [] };

  for (const { check, reason } of failed) {
    if (check.operation === 'created') {
      const removal = plan.destroy.find((item) => item.recordId === check.recordId);

      if (removal === undefined) {
        plan.destroy.push({ recordId: check.recordId, reasons: [reason], workspaceMemberId: check.workspaceMemberId });
      } else {
        removal.reasons.push(reason);
      }
      continue;
    }
    const putBack = plan.putBack.find((item) => item.recordId === check.recordId);

    if (putBack === undefined) {
      plan.putBack.push({
        recordId: check.recordId,
        data: { [check.field]: check.before },
        reasons: [reason],
        workspaceMemberId: check.workspaceMemberId,
      });
    } else {
      putBack.data[check.field] = check.before;
      putBack.reasons.push(reason);
    }
  }
  return plan;
};
