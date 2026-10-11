import { WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type LeadSaveInput } from 'src/crm/lead/types/lead-save-input.type';
import { planDateClosed } from 'src/crm/lead/utils/date-closed.util';

// The rules that depend on what a save wrote, not only on the result. They
// must run once per save: the app's own writes apply them before writing.
export const planLeadSave = ({ operation, before, after, written, now, context, creatorMemberId }: LeadSaveInput): Partial<LeadRow> => {
  const stageOf = (id: string | null) => context.stages.find((stage) => stage.id === id) ?? null;
  const values: Partial<LeadRow> = {};

  if (operation === 'created') {
    // The person who creates a lead is its salesperson unless one was given.
    if (after.salespersonId === null && creatorMemberId !== null) {
      values.salespersonId = creatorMemberId;
    }

    return values;
  }

  const stageChanged = written.has('stageId') && before?.stageId !== after.stageId;
  const stageIsWon = stageChanged && stageOf(after.stageId)?.isWon === true;

  if (stageChanged) {
    values.dateLastStageUpdate = now;
  }
  // A won stage means 100 %, and a lost lead put there is active again; its
  // lost reason stays.
  if (stageIsWon) {
    values.probability = 100;
    values.automatedProbability = 100;
    if (after.wonStatus === WON_STATUS.LOST) {
      values.wonStatus = WON_STATUS.PENDING;
    }
  }
  if (written.has('salespersonId')) {
    if (after.salespersonId === null) {
      values.dateOpen = null;
    } else if (after.salespersonId !== before?.salespersonId) {
      values.dateOpen = now;
    }
  }

  const closed = planDateClosed({
    writtenProbability: stageIsWon ? 100 : written.has('probability') ? (after.probability ?? 0) : undefined,
    markedLost:
      !stageIsWon && written.has('wonStatus') && after.wonStatus === WON_STATUS.LOST && before?.wonStatus !== WON_STATUS.LOST,
    stageChanged,
    stageIsWon,
    beforeStageIsWon: stageOf(before?.stageId ?? null)?.isWon === true,
    now,
  });

  return closed === null ? values : { ...values, ...closed };
};
