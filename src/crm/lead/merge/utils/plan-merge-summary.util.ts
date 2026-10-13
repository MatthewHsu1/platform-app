import { LEAD_TYPE } from 'src/crm/crm-options.constant';
import { type MergeSummaryNames } from 'src/crm/lead/merge/types/merge-summary-names.type';
import { type CurrencyValue } from 'src/crm/lead/types/currency-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

type Label = (message: string, values?: TranslationValues) => string;

const PRIORITY_LABELS: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', VERY_HIGH: 'Very High' };

const money = (value: CurrencyValue | null) =>
  value === null || value.amountMicros === null || value.amountMicros === 0
    ? null
    : `${(value.amountMicros / 1_000_000).toFixed(2)} ${value.currencyCode ?? ''}`.trim();

const dateTime = (value: string) => `${value.slice(0, 16).replace('T', ' ')} UTC`;

const nameOf = (names: Readonly<Record<string, string>>, id: string | null) => (id === null ? null : (names[id] ?? null));

const text = (value: string | null | undefined) => (value === null || value === undefined || value === '' ? null : value);

const line = (value: string | null, render: (value: string) => string) => (value === null ? null : render(value));

const block = (title: string, lines: (string | null)[]) => {
  const set = lines.filter((entry): entry is string => entry !== null);

  return set.length === 0 ? [] : ['', `**${title}**`, '', ...set.map((entry) => `- ${entry}`)];
};

const revenueLine = (tail: LeadRow, names: MergeSummaryNames, label: Label) => {
  const expected = money(tail.expectedRevenue);
  const recurring = money(tail.recurringRevenue);
  const recurringText =
    recurring === null ? null : [recurring, nameOf(names.plans, tail.recurringPlanId)].filter((part) => part !== null).join(' ');

  if (expected !== null) {
    return label('Expected revenue: {amount}', {
      amount: recurringText === null ? expected : `${expected} + ${recurringText}`,
    });
  }

  return line(recurringText, (amount) => label('Recurring revenue: {amount}', { amount }));
};

const tailBlock = (tail: LeadRow, names: MergeSummaryNames, label: Label) => {
  const notes = text(tail.description?.markdown?.trim());
  const tags = tail.tags ?? [];
  const facts = [
    revenueLine(tail, names, label),
    (tail.probability ?? 0) === 0 ? null : label('Probability: {probability} %', { probability: tail.probability ?? 0 }),
    label('Type: {type}', { type: label(tail.leadType === LEAD_TYPE.OPPORTUNITY ? 'Opportunity' : 'Lead') }),
    tail.leadType === LEAD_TYPE.LEAD ? null : line(nameOf(names.stages, tail.stageId), (stage) => label('Stage: {stage}', { stage })),
    line(text(tail.priority), (priority) => label('Priority: {priority}', { priority: label(PRIORITY_LABELS[priority] ?? priority) })),
    line(nameOf(names.lostReasons, tail.lostReasonId), (reason) => label('Lost reason: {reason}', { reason })),
    label('Created on: {date}', { date: dateTime(tail.createdAt) }),
    line(text(tail.dateDeadline), (date) => label('Expected closing: {date}', { date })),
    line(notes, (value) => label('Notes: {notes}', { notes: value })),
    line(text(tail.language), (language) => label('Language: {language}', { language })),
    line(text(tail.referred), (referred) => label('Referred by: {referred}', { referred })),
    tags.length === 0 ? null : label('Tags: {tags}', { tags: tags.join(', ') }),
    line(nameOf(names.members, tail.salespersonId), (name) => label('Salesperson: {name}', { name })),
    line(nameOf(names.teams, tail.teamId), (name) => label('Sales team: {name}', { name })),
  ];
  const phone =
    text(tail.phone?.primaryPhoneNumber) === null
      ? null
      : [tail.phone?.primaryPhoneCallingCode, tail.phone?.primaryPhoneNumber].filter((part) => text(part) !== null).join(' ');
  const email = text(tail.emailFrom?.primaryEmail);
  const website = text(tail.website?.primaryLinkUrl);
  // The contact block shows only when one of these is set; the job position
  // then joins it.
  const hasContact =
    text(tail.contactName) !== null || text(tail.partnerName) !== null || phone !== null || email !== null || website !== null;
  const address = tail.contactAddress;

  return [
    label('Merged the lead **{name}** into this one.', { name: tail.name ?? '' }),
    '',
    ...facts.filter((fact): fact is string => fact !== null).map((fact) => `- ${fact}`),
    ...(hasContact
      ? block(label('Contact details'), [
          line(text(tail.contactName), (value) => label('Contact: {value}', { value })),
          line(text(tail.partnerName), (value) => label('Company name: {value}', { value })),
          line(phone, (value) => label('Phone: {value}', { value })),
          line(email, (value) => label('Email: {value}', { value })),
          line(website, (value) => label('Website: {value}', { value })),
          line(text(tail.jobPosition), (value) => label('Job position: {value}', { value })),
        ])
      : []),
    ...block(label('Address'), [
      text(address?.addressStreet1),
      text(address?.addressStreet2),
      text(address?.addressPostcode),
      text(address?.addressCity),
      text(address?.addressState),
      text(address?.addressCountry),
    ]),
    ...block(label('Marketing'), [
      line(nameOf(names.campaigns, tail.campaignId), (value) => label('Campaign: {value}', { value })),
      line(nameOf(names.mediums, tail.mediumId), (value) => label('Medium: {value}', { value })),
      line(nameOf(names.sources, tail.sourceId), (value) => label('Source: {value}', { value })),
    ]),
  ].join('\n');
};

// The note left on the kept lead: one block per merged-away lead, written
// before anything moves so it shows what each lead held.
export const planMergeSummary = ({
  tails,
  names,
  label,
}: {
  tails: LeadRow[];
  names: MergeSummaryNames;
  label: Label;
}) => tails.map((tail) => tailBlock(tail, names, label)).join('\n\n---\n\n');
