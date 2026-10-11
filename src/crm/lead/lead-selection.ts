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

// The lead fields a read with this selection holds; the others read as empty
// whatever is stored.
export const leadSelectionFields = ({ withTeam, withScoringFields = false }: { withTeam: boolean; withScoringFields?: boolean }) =>
  new Set(
    leadSelection({ withTeam, withScoringFields })
      .replace(/\{[^}]*\}/g, ' ')
      .split(/\s+/)
      .filter((field) => field !== ''),
  );

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
const listOrNull = (value: unknown) => (Array.isArray(value) && value.length > 0 ? (value as unknown[]) : null);

// A composite keeps only the parts the selection reads, in one order, so an
// event's value and a read value of the same data are equal. Empty parts read
// as null, and a composite with no part filled reads as null.
const composite = <TValue>(value: unknown, parts: Record<string, 'text' | 'list'>): TValue | null => {
  const raw = objectOrNull<Record<string, unknown>>(value);

  if (raw === null) {
    return null;
  }
  const read = Object.fromEntries(
    Object.entries(parts).map(([part, kind]) => [
      part,
      kind === 'text' ? text(raw[part]) : listOrNull(raw[part]),
    ]),
  );

  return Object.values(read).every((part) => part === null) ? null : (read as TValue);
};
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
  emailFrom: composite(node.emailFrom, { primaryEmail: 'text', additionalEmails: 'list' }),
  phone: composite(node.phone, {
    primaryPhoneNumber: 'text',
    primaryPhoneCountryCode: 'text',
    primaryPhoneCallingCode: 'text',
    additionalPhones: 'list',
  }),
  website: composite(node.website, { primaryLinkUrl: 'text', primaryLinkLabel: 'text', secondaryLinks: 'list' }),
  contactAddress: composite(node.contactAddress, {
    addressStreet1: 'text',
    addressStreet2: 'text',
    addressCity: 'text',
    addressPostcode: 'text',
    addressState: 'text',
    addressCountry: 'text',
  }),
  contactName: text(node.contactName),
  partnerName: text(node.partnerName),
  jobPosition: text(node.jobPosition),
  referred: text(node.referred),
  description: composite(node.description, { markdown: 'text' }),
  tags: Array.isArray(node.tags) ? node.tags.map(String) : null,
  language: text(node.language),
  phoneState: text(node.phoneState),
  emailState: text(node.emailState),
  isRotting: typeof node.isRotting === 'boolean' ? node.isRotting : null,
  rottingDays: numberOrNull(node.rottingDays),
  createdBy: composite(node.createdBy, { source: 'text', workspaceMemberId: 'text' }),
  updatedBy: composite(node.updatedBy, { source: 'text', workspaceMemberId: 'text' }),
});
