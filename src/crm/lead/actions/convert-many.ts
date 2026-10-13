import { convertAndAllocate } from 'src/crm/lead/actions/convert-and-allocate';
import { twentyConvertApi } from 'src/crm/lead/actions/convert-api';
import { planMergedHead, requireCustomerRights } from 'src/crm/lead/actions/convert-lead-shared';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { makeConvertMany } from 'src/crm/lead/actions/make-convert-many';
import { type ConvertManyInput } from 'src/crm/lead/actions/types/convert-many-input.type';
import { LEADS_NOT_FOUND } from 'src/crm/lead/lead-messages.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { findLeadDuplicates } from 'src/crm/lead/merge/find-lead-duplicates';
import { mergeLeads } from 'src/crm/lead/merge/merge-leads';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// The contact's email comes first, else the lead's own: a company has no email.
const duplicateEmail = async (lead: LeadRow) => {
  const contactEmail = lead.personId === null ? '' : ((await twentyConvertApi.readPerson(lead.personId))?.emails?.primaryEmail ?? '');
  const leadEmail = lead.emailFrom?.primaryEmail ?? '';

  return contactEmail.length > 0 ? contactEmail : leadEmail.length > 0 ? leadEmail : null;
};

// The pending leads that look like the same deal as this one, it included,
// as the user sees them.
export const findPendingDuplicates = async (lead: LeadRow) =>
  findLeadDuplicates({
    email: await duplicateEmail(lead),
    personId: lead.personId,
    companyId: lead.companyId,
    includeLost: false,
    caller: 'person',
  });

// In the order given, as the user sees them. A lead in the trash is
// returned apart; a lead the user cannot see stops the whole action.
export const readLeadsLeftInPlay = async (leadIds: string[]) => {
  const found = await queryLeads('person', { id: { in: leadIds } });
  const byId = new Map(found.map((lead) => [lead.id, lead]));
  const missing = leadIds.filter((id) => !byId.has(id));
  const trashedFound =
    missing.length === 0 ? [] : await queryLeads('person', { id: { in: missing }, deletedAt: { is: 'NOT_NULL' } });
  const unseen = missing.length - trashedFound.length;

  if (unseen > 0) {
    throw new LeadActionError(LEADS_NOT_FOUND, { count: unseen }, 404);
  }

  const trashedById = new Map(trashedFound.map((lead) => [lead.id, lead]));
  const inOrder = (rows: Map<string, LeadRow>) =>
    leadIds.flatMap((id) => {
      const lead = rows.get(id);

      return lead === undefined ? [] : [lead];
    });

  return { inPlay: inOrder(byId), trashed: inOrder(trashedById) };
};

export const convertMany = async (input: ConvertManyInput) => {
  // Read once per run, for every group's merged lead.
  let stages: Promise<StageRow[]> | null = null;
  const readStages = () => (stages ??= loadLeadContext([]).then((context) => context.stages));

  return makeConvertMany({
    readLeads: readLeadsLeftInPlay,
    findDuplicates: findPendingDuplicates,
    mergedHead: async (group) => planMergedHead(group, await readStages()),
    requireCustomerRights,
    mergeLeads: (leadIds) => mergeLeads(leadIds, { caller: 'person' }),
    convertAndAllocate,
  })(input);
};
