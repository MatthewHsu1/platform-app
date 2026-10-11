import { leadSelection, leadSelectionFields, readLeadRow } from 'src/crm/lead/lead-selection';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type AppLeadWriteApi } from 'src/crm/lead/types/app-lead-write-api.type';
import { type LeadTriggerApi } from 'src/crm/lead/types/lead-trigger-api.type';
import { applyStatusMoves } from 'src/crm/scoring/apply-status-moves';
import { updateWhere } from 'src/shared/compare-and-set';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { putBack } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';

const LEADS = { objectSingular: 'crmLead', objectPlural: 'crmLeads' } as const;
const leads = records(LEADS.objectSingular, LEADS.objectPlural);

// Every Platform read of a lead uses this selection.
export const LEAD_SELECTION = leadSelection({ withTeam: false });
export const LEAD_SELECTION_FIELDS = leadSelectionFields({ withTeam: false });

export const readLeadsById = async (ids: string[]) =>
  (
    await readInChunks(ids, (part) => leads.find<Record<string, unknown>>({ id: { in: part } }, LEAD_SELECTION))
  ).map(readLeadRow);

export const TWENTY_LEAD_TRIGGER_API: LeadTriggerApi = {
  now: () => new Date().toISOString(),
  readFields: LEAD_SELECTION_FIELDS,
  readLeads: readLeadsById,
  loadContext: loadLeadContext,
  updateLead: (id, data) => leads.update(id, data),
  putBackLead: (id, data, reason) => putBack({ ...LEADS, recordId: id, data, reason }),
  destroyLead: async (id) => {
    await leads.destroyMany([id]);
  },
  pushPerson: async () => undefined,
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
};
