import { WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadComputesInput } from 'src/crm/lead/types/lead-computes-input.type';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { wholeDaysBetween, withoutMilliseconds } from 'src/crm/lead/utils/days.util';
import { emailState } from 'src/crm/lead/utils/email.util';
import { findStage } from 'src/crm/lead/utils/find-stage.util';
import { planMoney } from 'src/crm/lead/utils/money.util';
import { phoneState } from 'src/crm/lead/utils/phone.util';
import { planTeamDefault } from 'src/crm/lead/utils/plan-team-default.util';
import { sameProbability } from 'src/crm/lead/utils/probability.util';
import { cleanWebsite } from 'src/crm/lead/utils/website.util';
import { planWonStatus } from 'src/crm/lead/utils/won-status.util';
import { sameValue } from 'src/shared/utils/same-value.util';

export const DEFAULT_OPPORTUNITY_NAME_TEMPLATE = "{name}'s opportunity";

const WON_STATUS_INPUTS = ['probability', 'stageId', 'wonStatus'] as const;

const partnerNameOf = (lead: LeadRow, context: LeadContext) => {
  if (lead.personId !== null) {
    const person = context.people.get(lead.personId);
    const fullName = [person?.name?.firstName ?? '', person?.name?.lastName ?? ''].join(' ').trim();

    return fullName === '' ? null : fullName;
  }
  if (lead.companyId !== null) {
    const name = context.companies.get(lead.companyId)?.name?.trim() ?? '';

    return name === '' ? null : name;
  }

  return null;
};

// Values that follow from the row alone. Running them twice gives the same
// result, so they run on every write, the app's own included. A field the save
// wrote itself is left alone.
export const planLeadComputes = (input: LeadComputesInput): Partial<LeadRow> => {
  const { operation, before, written, now, context } = input;
  const isCreate = operation === 'created';
  const values: Partial<LeadRow> = {};
  let lead: LeadRow = { ...input.lead };

  const set = <TKey extends keyof LeadRow>(field: TKey, value: LeadRow[TKey]) => {
    if (!sameValue(lead[field], value)) {
      values[field] = value;
      lead = { ...lead, [field]: value };
    }
  };
  const changed = (field: keyof LeadRow) => isCreate || before === null || !sameValue(before[field], lead[field]);
  const isFree = (field: keyof LeadRow) => !written.has(field);
  const stageOf = (id: string | null) => context.stages.find((stage) => stage.id === id) ?? null;

  if (changed('stageId') && lead.dateLastStageUpdate === null && isFree('dateLastStageUpdate')) {
    set('dateLastStageUpdate', now);
  }
  if (changed('salespersonId') && lead.salespersonId !== null && lead.dateOpen === null && isFree('dateOpen')) {
    set('dateOpen', now);
  }

  // The team follows the salesperson and the type before the stage follows the team.
  const team = planTeamDefault({ operation, before, lead, written, context });

  if (team.teamId !== undefined) {
    set('teamId', team.teamId);
  }

  // A stage limited to other teams, or no stage, gives way to the first open
  // stage of the lead's team.
  if ((isCreate || changed('teamId') || changed('leadType')) && isFree('stageId')) {
    const stage = stageOf(lead.stageId);

    if (stage === null || (lead.teamId !== null && stage.teamIds.length > 0 && !stage.teamIds.includes(lead.teamId))) {
      set('stageId', findStage({ stages: context.stages, teamId: lead.teamId, foldFilter: true, limit: 'first' })[0]?.id ?? null);
    }
  }

  // An unnamed lead is named after its contact or customer, even when the
  // save emptied the name itself.
  if ((isCreate || changed('personId') || changed('companyId')) && (lead.name ?? '') === '') {
    const partnerName = partnerNameOf(lead, context);

    if (partnerName !== null) {
      set('name', (input.opportunityNameTemplate ?? DEFAULT_OPPORTUNITY_NAME_TEMPLATE).replace('{name}', partnerName));
    }
  }

  const website = lead.website?.primaryLinkUrl ?? null;

  if (lead.website !== null && website !== null && cleanWebsite(website) !== website) {
    set('website', { ...lead.website, primaryLinkUrl: cleanWebsite(website) });
  }
  set('phoneState', phoneState(lead.phone));
  set('emailState', emailState(lead.emailFrom));

  // No stage scores 0 and a won stage 100; an open stage takes the score of
  // past leads when one exists, else nothing changes.
  const archived = lead.wonStatus === WON_STATUS.LOST;
  const restoredFromLost = before?.wonStatus === WON_STATUS.LOST && !archived;

  if (isCreate || operation === 'restored' || input.rescore === true || restoredFromLost || changed('stageId') || changed('teamId')) {
    const stage = stageOf(lead.stageId);
    const score = lead.stageId === null ? 0 : stage?.isWon === true ? 100 : (context.score?.(lead) ?? null);

    if (score !== null) {
      // A new lead given no probability takes the score; otherwise only a
      // probability still equal to the old score follows it.
      const wasAutomatic =
        isCreate && !written.has('probability') ? true : sameProbability(lead.probability, lead.automatedProbability);

      if (isFree('automatedProbability')) {
        set('automatedProbability', score);
      }
      if (wasAutomatic && !archived && isFree('probability')) {
        set('probability', score);
      }
    }
  }

  // The status follows its inputs: the probability, the stage and the lost
  // marker. A stage that stops being won leaves its won leads as they are
  // until one of those is written.
  if (isCreate || operation === 'restored' || WON_STATUS_INPUTS.some((field) => written.has(field) || changed(field))) {
    set('wonStatus', planWonStatus({ probability: lead.probability, stageIsWon: stageOf(lead.stageId)?.isWon === true, archived }));
  }

  const money = planMoney(lead, lead.recurringPlanId === null ? null : (context.recurringPlanMonths.get(lead.recurringPlanId) ?? null));

  set('proratedRevenue', money.proratedRevenue);
  set('recurringRevenueMonthly', money.recurringRevenueMonthly);
  set('recurringRevenueMonthlyProrated', money.recurringRevenueMonthlyProrated);
  set('recurringRevenueProrated', money.recurringRevenueProrated);

  // Days to assign ignore the creation time's milliseconds; days to close do not.
  set('dayOpen', lead.dateOpen === null ? null : wholeDaysBetween(withoutMilliseconds(lead.createdAt), lead.dateOpen));
  set('dayClose', wholeDaysBetween(lead.createdAt, lead.dateClosed));

  return values;
};
