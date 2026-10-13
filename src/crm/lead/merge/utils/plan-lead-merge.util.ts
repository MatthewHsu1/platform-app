import { LEAD_TYPE, PRIORITY_RANK, WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadMergePlan } from 'src/crm/lead/merge/types/lead-merge-plan.type';
import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { findStage } from 'src/crm/lead/utils/find-stage.util';

type FirstValueField =
  | 'campaignId'
  | 'mediumId'
  | 'sourceId'
  | 'name'
  | 'salespersonId'
  | 'language'
  | 'teamId'
  | 'referred'
  | 'stageId'
  | 'expectedRevenue'
  | 'recurringPlanId'
  | 'recurringRevenue'
  | 'dateDeadline'
  | 'partnerName'
  | 'contactName'
  | 'emailFrom'
  | 'jobPosition'
  | 'phone'
  | 'website';

const FIRST_VALUE_FIELDS: FirstValueField[] = [
  'campaignId',
  'mediumId',
  'sourceId',
  'name',
  'salespersonId',
  'language',
  'teamId',
  'referred',
  'stageId',
  'expectedRevenue',
  'recurringPlanId',
  'recurringRevenue',
  'dateDeadline',
  'partnerName',
  'contactName',
  'emailFrom',
  'jobPosition',
  'phone',
  'website',
];

const ADDRESS_PARTS: (keyof AddressValue)[] = [
  'addressStreet1',
  'addressStreet2',
  'addressCity',
  'addressPostcode',
  'addressState',
  'addressCountry',
];

// A stored value counts as set the way a merge reads it: an empty text, an
// amount of 0, an email list without a primary address, a phone without a
// number and a link without a URL are not set; a text of spaces is.
const isSet = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '' || value === 0) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('amountMicros' in record) {
      return isSet(record.amountMicros);
    }
    if ('primaryEmail' in record) {
      return isSet(record.primaryEmail);
    }
    if ('primaryPhoneNumber' in record) {
      return isSet(record.primaryPhoneNumber);
    }
    if ('primaryLinkUrl' in record) {
      return isSet(record.primaryLinkUrl);
    }
  }

  return true;
};

const stageSequence = (lead: LeadRow, stages: StageRow[]) =>
  stages.find((stage) => stage.id === lead.stageId)?.sequence ?? 0;

const isOpportunity = (lead: LeadRow) => lead.leadType === LEAD_TYPE.OPPORTUNITY;

const compareForMerge = (stages: StageRow[]) => (left: LeadRow, right: LeadRow) => {
  const keys = (lead: LeadRow) => [
    isOpportunity(lead) || lead.wonStatus !== WON_STATUS.LOST ? 1 : 0,
    isOpportunity(lead) ? 1 : 0,
    stageSequence(lead, stages),
    lead.probability ?? 0,
  ];
  const leftKeys = keys(left);
  const rightKeys = keys(right);

  for (let index = 0; index < leftKeys.length; index += 1) {
    if (leftKeys[index] !== rightKeys[index]) {
      return rightKeys[index] - leftKeys[index];
    }
  }

  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
};

// Most likely to be won first: an opportunity or a lead not lost, an
// opportunity, a later stage, a higher probability, then the older lead.
export const sortForMerge = (leads: LeadRow[], stages: StageRow[]) => [...leads].sort(compareForMerge(stages));

const filledAddressParts = (lead: LeadRow) =>
  ADDRESS_PARTS.filter((part) => isSet(lead.contactAddress?.[part] ?? null)).length;

// The address goes as a whole, so no lead ends with a street from one lead
// and a city from another: from the lead with the most filled parts, the
// better-ranked one on a tie.
const mergedAddress = (sorted: LeadRow[]) =>
  sorted.reduce((best, lead) => (filledAddressParts(lead) > filledAddressParts(best) ? lead : best)).contactAddress;

const mergedPriority = (sorted: LeadRow[]) =>
  sorted
    .map((lead) => lead.priority)
    .filter((priority): priority is string => isSet(priority))
    .reduce<string | null>(
      (highest, priority) =>
        highest === null || (PRIORITY_RANK[priority] ?? 0) > (PRIORITY_RANK[highest] ?? 0) ? priority : highest,
      null,
    );

const mergedTags = (sorted: LeadRow[]) => [...new Set(sorted.flatMap((lead) => lead.tags ?? []))];

// Whether `whole` holds `part` as whole paragraphs (paragraphs are split by a
// blank line, as the merge joins them).
const holdsParagraphs = (whole: string, part: string) => `\n\n${whole}\n\n`.includes(`\n\n${part}\n\n`);

// The texts joined in merge order. A text another merged lead's text already
// holds is not added again: a merge stopped after the kept lead got the joined
// text but before the others went to the trash, run again, finds that text on
// the kept lead and keeps it as it is. Two leads with the same text keep one
// copy.
const mergedDescription = (sorted: LeadRow[]) => {
  const texts = sorted
    .map((lead) => lead.description?.markdown ?? '')
    .filter((text) => text.trim().length > 0);
  const kept = texts.filter(
    (text, index) =>
      !texts.some(
        (other, otherIndex) => (other.length > text.length || (other === text && otherIndex < index)) && holdsParagraphs(other, text),
      ),
  );

  return { markdown: kept.length === 0 ? null : kept.join('\n\n') };
};

export const planLeadMerge = ({
  leads,
  stages,
  salespersonId,
  teamId,
}: {
  leads: LeadRow[];
  stages: StageRow[];
  salespersonId?: string | null;
  teamId?: string | null;
}): LeadMergePlan => {
  const sorted = sortForMerge(leads, stages);
  const [head, ...tails] = sorted;
  const data: Partial<LeadRow> = {};

  for (const field of FIRST_VALUE_FIELDS) {
    const source = sorted.find((lead) => isSet(lead[field]));

    Object.assign(data, { [field]: source === undefined ? null : source[field] });
  }

  // One customer: the contact and the company come from the same lead.
  const customerSource = sorted.find((lead) => lead.personId !== null || lead.companyId !== null);

  data.personId = customerSource?.personId ?? null;
  data.companyId = customerSource?.companyId ?? null;
  data.description = mergedDescription(sorted);
  data.leadType = sorted.some(isOpportunity) ? LEAD_TYPE.OPPORTUNITY : LEAD_TYPE.LEAD;
  data.priority = mergedPriority(sorted);
  data.tags = mergedTags(sorted);
  data.lostReasonId =
    (head.probability ?? 0) !== 0 ? null : (sorted.find((lead) => lead.lostReasonId !== null)?.lostReasonId ?? null);
  data.contactAddress = mergedAddress(sorted);

  if (isSet(salespersonId)) {
    data.salespersonId = salespersonId;
  }
  if (isSet(teamId)) {
    data.teamId = teamId;
  }

  // The stage must suit the merged team: a stage for every team or one of
  // that team's, else the team's first stage, folded ones included.
  if (isSet(data.teamId)) {
    const allowed = findStage({ stages, teamId: data.teamId ?? null, foldFilter: false, limit: 'all' });

    if (!allowed.some((stage) => stage.id === data.stageId)) {
      data.stageId = allowed[0]?.id ?? null;
    }
  }

  // Left out when unchanged, so the save rules do not see a salesperson or
  // team change that did not happen.
  // Tags and language are staff lists staff may delete. With no value on any
  // merged lead the head already has none, so they are left out of the write.
  if (data.tags?.length === 0) {
    delete data.tags;
  }
  if (data.language === null) {
    delete data.language;
  }
  if (data.salespersonId === head.salespersonId) {
    delete data.salespersonId;
  }
  if (data.teamId === head.teamId) {
    delete data.teamId;
  }

  return { headId: head.id, tailIds: tails.map((lead) => lead.id), data };
};
