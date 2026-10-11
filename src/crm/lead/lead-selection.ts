import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

const MONEY = '{ amountMicros currencyCode }';

const BASE_SELECTION = [
  'id createdAt deletedAt name leadType wonStatus priority',
  'stageId salespersonId personId companyId lostReasonId recurringPlanId sourceId mediumId campaignId',
  'probability automatedProbability',
  `expectedRevenue ${MONEY} recurringRevenue ${MONEY} proratedRevenue ${MONEY}`,
  `recurringRevenueMonthly ${MONEY} recurringRevenueMonthlyProrated ${MONEY} recurringRevenueProrated ${MONEY}`,
  'dateOpen dateClosed dateConversion dateLastStageUpdate dateDeadline dayOpen dayClose',
  'emailFrom { primaryEmail additionalEmails }',
  'phone { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode additionalPhones }',
  'website { primaryLinkUrl primaryLinkLabel secondaryLinks }',
  'contactAddress { addressStreet1 addressStreet2 addressCity addressPostcode addressState addressCountry }',
  'contactName partnerName jobPosition referred phoneState emailState isRotting rottingDays',
  'description { markdown }',
  'createdBy { source workspaceMemberId } updatedBy { source workspaceMemberId }',
].join(' ');

// The lead's team field arrives with the sales teams; tags and language are
// staff lists made by the install step and are read only by the rules that
// need them.
export const leadSelection = ({ withTeam, withScoringFields = false }: { withTeam: boolean; withScoringFields?: boolean }) =>
  [BASE_SELECTION, withTeam ? 'teamId' : '', withScoringFields ? 'tags language' : ''].filter(Boolean).join(' ');

const text = (value: unknown) => (typeof value === 'string' ? textOrNull(value) : null);
const numberOrNull = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};
const objectOrNull = <TValue>(value: unknown) =>
  value !== null && typeof value === 'object' ? (value as TValue) : null;
const money = (value: unknown) => {
  const raw = objectOrNull<{ amountMicros?: unknown; currencyCode?: unknown }>(value);

  return raw === null ? null : { amountMicros: numberOrNull(raw.amountMicros), currencyCode: text(raw.currencyCode) };
};

export const readLeadRow = (node: Record<string, unknown>): LeadRow => ({
  id: String(node.id),
  createdAt: String(node.createdAt),
  deletedAt: text(node.deletedAt),
  name: text(node.name),
  leadType: text(node.leadType),
  wonStatus: text(node.wonStatus),
  priority: text(node.priority),
  stageId: text(node.stageId),
  teamId: text(node.teamId),
  salespersonId: text(node.salespersonId),
  personId: text(node.personId),
  companyId: text(node.companyId),
  lostReasonId: text(node.lostReasonId),
  recurringPlanId: text(node.recurringPlanId),
  sourceId: text(node.sourceId),
  mediumId: text(node.mediumId),
  campaignId: text(node.campaignId),
  probability: numberOrNull(node.probability),
  automatedProbability: numberOrNull(node.automatedProbability),
  expectedRevenue: money(node.expectedRevenue),
  recurringRevenue: money(node.recurringRevenue),
  proratedRevenue: money(node.proratedRevenue),
  recurringRevenueMonthly: money(node.recurringRevenueMonthly),
  recurringRevenueMonthlyProrated: money(node.recurringRevenueMonthlyProrated),
  recurringRevenueProrated: money(node.recurringRevenueProrated),
  dateOpen: text(node.dateOpen),
  dateClosed: text(node.dateClosed),
  dateConversion: text(node.dateConversion),
  dateLastStageUpdate: text(node.dateLastStageUpdate),
  dateDeadline: text(node.dateDeadline),
  dayOpen: numberOrNull(node.dayOpen),
  dayClose: numberOrNull(node.dayClose),
  emailFrom: objectOrNull(node.emailFrom),
  phone: objectOrNull(node.phone),
  website: objectOrNull(node.website),
  contactAddress: objectOrNull(node.contactAddress),
  contactName: text(node.contactName),
  partnerName: text(node.partnerName),
  jobPosition: text(node.jobPosition),
  referred: text(node.referred),
  description: objectOrNull(node.description),
  tags: Array.isArray(node.tags) ? node.tags.map(String) : null,
  language: text(node.language),
  phoneState: text(node.phoneState),
  emailState: text(node.emailState),
  isRotting: typeof node.isRotting === 'boolean' ? node.isRotting : null,
  rottingDays: numberOrNull(node.rottingDays),
  createdBy: objectOrNull(node.createdBy),
  updatedBy: objectOrNull(node.updatedBy),
});
