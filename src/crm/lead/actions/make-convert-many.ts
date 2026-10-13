import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { type ConvertManyApi } from 'src/crm/lead/actions/types/convert-many-api.type';
import { type ConvertManyInput } from 'src/crm/lead/actions/types/convert-many-input.type';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { planDedupeWalkOrder, planFinalList } from 'src/crm/lead/actions/utils/plan-mass-convert.util';
import { MERGE_LIMIT } from 'src/crm/lead/merge/merge-limit.constant';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// The groups to merge, found before anything is written. A lead already in a
// group is not searched again, nor taken into a later group. A selected lead
// in the trash was merged away by an earlier run that stopped: the lead its
// search finds is the one that merge kept, so it is converted too.
const findGroups = async (api: ConvertManyApi, inPlay: LeadRow[], trashed: LeadRow[]) => {
  const trashedIds = new Set(trashed.map((lead) => lead.id));
  const grouped = new Set<string>();
  const groups: LeadRow[][] = [];

  for (const lead of planDedupeWalkOrder([...inPlay, ...trashed])) {
    if (grouped.has(lead.id)) {
      continue;
    }
    const group = (await api.findDuplicates(lead)).filter((member) => !grouped.has(member.id));

    if (group.length > MERGE_LIMIT) {
      throw new LeadActionError(CONVERT_MESSAGES.tooManyDuplicates, { name: lead.name ?? lead.id, max: MERGE_LIMIT });
    }
    if (group.length > 1 || (trashedIds.has(lead.id) && group.length === 1)) {
      groups.push(group);
      group.forEach((member) => grouped.add(member.id));
    }
  }

  return groups;
};

// Merges the duplicates of the selected leads, then converts and assigns
// what is left. A merge cannot be undone, so the group sizes and the user's
// right to make every customer the conversion needs are checked before the
// first one: a refusal changes nothing. Started again after a stop, the
// merged-away leads are found in the trash and their kept leads converted;
// the conversion finds the customers the first run made.
export const makeConvertMany = (api: ConvertManyApi) => async (input: ConvertManyInput) => {
  const options: ConvertOptions = {
    customerAction: input.customerAction,
    personId: input.personId,
    companyId: null,
    salespersonIds: input.salespersonIds,
    teamId: input.teamId,
    force: input.force,
    runId: input.runId,
  };
  const { inPlay, trashed } = await api.readLeads(input.leadIds);
  const groups = input.deduplicate ? await findGroups(api, inPlay, trashed) : [];
  const groupedIds = new Set(groups.flat().map((lead) => lead.id));
  const toConvert = inPlay.filter((lead) => !groupedIds.has(lead.id));

  for (const group of groups) {
    const head = group.length > 1 ? await api.mergedHead(group) : group[0];

    if (head !== null) {
      toConvert.push(head);
    }
  }
  // A lost lead keeps its customer.
  await api.requireCustomerRights(
    toConvert.filter((lead) => lead.wonStatus !== WON_STATUS.LOST),
    options,
  );

  const headIds: string[] = [];

  for (const group of groups) {
    headIds.push(group.length > 1 ? (await api.mergeLeads(group.map((member) => member.id))).headId : group[0].id);
  }

  const finalIds = planFinalList({ selectedIds: inPlay.map((lead) => lead.id), mergedIds: groupedIds, headIds });
  const { inPlay: finalLeads } = await api.readLeads(finalIds);

  await api.convertAndAllocate(finalLeads, options);

  return { leadIds: finalLeads.map((lead) => lead.id) };
};
