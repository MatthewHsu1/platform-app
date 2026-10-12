import { applyPersonPushes } from 'src/crm/lead/apply-person-pushes';
import { leadSelectionFields, readLeadRow } from 'src/crm/lead/lead-selection';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type AppLeadWriteApi } from 'src/crm/lead/types/app-lead-write-api.type';
import { type LeadTriggerApi } from 'src/crm/lead/types/lead-trigger-api.type';
import { readWithScoringFields } from 'src/crm/lead/utils/read-with-scoring-fields.util';
import { applyStatusMoves } from 'src/crm/scoring/apply-status-moves';
import { updateWhere } from 'src/shared/compare-and-set';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { putBack } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';

const LEADS = { objectSingular: 'crmLead', objectPlural: 'crmLeads' } as const;
const leads = records(LEADS.objectSingular, LEADS.objectPlural);

// The lead rules read every lead with tags and language: a save rescores the
// lead and counts it when it is won or lost.
export const LEAD_SELECTION_FIELDS = leadSelectionFields({ withTeam: true, withScoringFields: true });

type FindLeads = (filter: Record<string, unknown>, selection: string) => Promise<Record<string, unknown>[]>;

export const makeReadLeadsById = (find: FindLeads) => async (ids: string[]) =>
  (
    await readInChunks(ids, (part) => readWithScoringFields((selection) => find({ id: { in: part } }, selection), { withTeam: true }))
  ).map(readLeadRow);

export const readLeadsById = makeReadLeadsById((filter, selection) => leads.find<Record<string, unknown>>(filter, selection));

export const TWENTY_LEAD_TRIGGER_API: LeadTriggerApi = {
  now: () => new Date().toISOString(),
  readFields: LEAD_SELECTION_FIELDS,
  readLeads: readLeadsById,
  loadContext: loadLeadContext,
  updateLead: (id, data) => leads.update(id, data),
  updateLeads: (ids, data) => leads.updateMany(ids, data),
  putBackLead: (id, data, reason) => putBack({ ...LEADS, recordId: id, data, reason }),
  destroyLead: async (id) => {
    await leads.destroyMany([id]);
  },
  pushPeople: applyPersonPushes,
  applyStatusMoves,
  memberLocale: readMemberLocale,
  translate: (locale, message) => translate(locale, message),
};

export const TWENTY_APP_LEAD_WRITE_API: AppLeadWriteApi = {
  now: () => new Date().toISOString(),
  readLeads: readLeadsById,
  loadContext: loadLeadContext,
  updateLeads: (ids, data) => leads.updateMany(ids, data),
  updateLeadWhere: (filter, data) => updateWhere({ ...LEADS, filter, data }),
  applyStatusMoves,
  pushPeople: applyPersonPushes,
};
