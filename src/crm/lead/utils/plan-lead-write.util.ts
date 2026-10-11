import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type LeadSaveStep } from 'src/crm/lead/types/lead-save-step.type';
import { type LeadWritePlan } from 'src/crm/lead/types/lead-write-plan.type';
import { planLeadComputes } from 'src/crm/lead/utils/plan-lead-computes.util';
import { planLeadSave } from 'src/crm/lead/utils/plan-lead-save.util';
import { changedLeadValues, toLeadInput } from 'src/crm/lead/utils/to-lead-input.util';
import { planWonStageRefusal, WON_STAGE_REFUSAL_MESSAGE } from 'src/crm/lead/utils/won-stage-refusal.util';
import { statusMovesBetween } from 'src/crm/lead/utils/won-status.util';

const STATUS_FIELDS = new Set(['stageId', 'probability', 'wonStatus']);
const NO_MOVES = { won: 0, lost: 0 } as const;

const pick = (row: LeadRow, fields: Iterable<string>) => {
  const wanted = new Set(fields);

  return Object.fromEntries(Object.entries(row).filter(([field]) => wanted.has(field))) as Partial<LeadRow>;
};

type ComposeInput = {
  operation: 'created' | 'updated' | 'restored';
  current: LeadRow;
  steps: LeadSaveStep[];
  now: string;
  context: LeadContext;
  rescore?: boolean;
  opportunityNameTemplate?: string;
  // The fields `current` was read with; a written field outside them is left as stored.
  readFields?: ReadonlySet<string>;
};

// Replays the saves of one lead in order, each one whole: its values, its save
// rules, the computes, then the won-stage check. A refused save is undone on
// its own; the saves before and after it keep their effects.
export const composeLeadWrite = ({
  operation,
  current,
  steps,
  now,
  context,
  rescore,
  opportunityNameTemplate,
  readFields,
}: ComposeInput): LeadWritePlan => {
  const stageOf = (id: string | null) => context.stages.find((stage) => stage.id === id) ?? null;
  const replayed = (fields: Iterable<string>) => [...fields].filter((field) => readFields === undefined || readFields.has(field));
  const allWritten = new Set(steps.flatMap((step) => replayed(step.written)));

  // A restore, or saves that are only the app's or already overtaken, get the
  // computes alone, on the stored row.
  if (operation === 'restored' || !steps.some((step) => step.staff)) {
    const values = planLeadComputes({
      operation,
      before: steps[0]?.before ?? null,
      lead: current,
      written: allWritten,
      staffSave: false,
      now,
      context,
      rescore,
      opportunityNameTemplate,
    });

    return { kind: 'write', data: toLeadInput(changedLeadValues(current, { ...current, ...values })), statusMoves: NO_MOVES, personPush: null };
  }

  const isCreate = operation === 'created';
  let state: LeadRow = isCreate || steps[0].before === null ? current : { ...current, ...pick(steps[0].before, allWritten) };
  let refusal: string | null = null;
  let touchesStatus = isCreate;

  for (const step of steps) {
    const written = new Set(replayed(step.written));
    const proposed: LeadRow = isCreate ? state : { ...state, ...pick(step.after, written) };
    const saveValues = step.staff
      ? planLeadSave({
          operation: isCreate ? 'created' : 'updated',
          before: isCreate ? null : state,
          after: proposed,
          written,
          now,
          context,
          creatorMemberId: step.creatorMemberId,
        })
      : {};
    const saved: LeadRow = { ...proposed, ...saveValues };
    const savedFields = new Set([...written, ...Object.keys(saveValues)]);
    let next: LeadRow = {
      ...saved,
      ...planLeadComputes({
        operation,
        before: isCreate ? null : state,
        lead: saved,
        written: savedFields,
        staffSave: step.staff,
        now,
        context,
        rescore,
        opportunityNameTemplate,
      }),
    };

    // A lead created in a won stage, given or chosen by the stage rule, is closed now.
    if (step.staff && isCreate && stageOf(next.stageId)?.isWon === true && next.dateClosed === null) {
      next = { ...next, dateClosed: now };
    }
    if (step.staff && planWonStageRefusal({ stage: stageOf(next.stageId), probability: next.probability, written: savedFields })) {
      if (isCreate) {
        return { kind: 'refuse', reason: WON_STAGE_REFUSAL_MESSAGE, undo: { kind: 'destroy' } };
      }
      refusal = WON_STAGE_REFUSAL_MESSAGE;
      continue;
    }
    if (step.staff && [...savedFields].some((field) => STATUS_FIELDS.has(field))) {
      touchesStatus = true;
    }
    state = next;
  }

  const data = toLeadInput(changedLeadValues(current, state));
  const statusMoves = touchesStatus ? statusMovesBetween(steps[0].before?.wonStatus ?? null, state.wonStatus) : NO_MOVES;

  return refusal === null
    ? { kind: 'write', data, statusMoves, personPush: null }
    : { kind: 'refuse', reason: refusal, undo: { kind: 'putBack', data, statusMoves } };
};

// One save. `after` is the lead as the save leaves it; the returned data is
// what must be written on top of it.
export const planLeadWrite = ({
  operation,
  before,
  after,
  written,
  applySaveRules,
  now,
  context,
  creatorMemberId,
  rescore,
  opportunityNameTemplate,
}: {
  operation: 'created' | 'updated' | 'restored';
  before: LeadRow | null;
  after: LeadRow;
  written: ReadonlySet<string>;
  applySaveRules: boolean;
  now: string;
  context: LeadContext;
  creatorMemberId: string | null;
  rescore?: boolean;
  opportunityNameTemplate?: string;
}): LeadWritePlan =>
  composeLeadWrite({
    operation,
    current: after,
    steps: [{ before, after, written, staff: applySaveRules, creatorMemberId }],
    now,
    context,
    rescore,
    opportunityNameTemplate,
  });
