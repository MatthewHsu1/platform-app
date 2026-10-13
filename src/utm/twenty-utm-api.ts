import { pickRandomColor } from 'src/crm/color-index.constant';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { putBack, restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { type UtmTriggerApi } from 'src/utm/types/utm-trigger-api.type';

const PLURALS = {
  utmCampaign: 'utmCampaigns',
  utmSource: 'utmSources',
  utmMedium: 'utmMediums',
  utmStage: 'utmStages',
  utmTag: 'utmTags',
} as const;

const rowsOf = (object: keyof typeof PLURALS) => records(object, PLURALS[object]);
const leads = records('crmLead', 'crmLeads');
const campaignTags = records('utmCampaignTag', 'utmCampaignTags');

export const TWENTY_UTM_TRIGGER_API: UtmTriggerApi = {
  findNamesLike: (object, bases) =>
    rowsOf(object).find({ or: bases.map((base) => ({ name: { ilike: `%${base}%` } })) }, 'id name active'),
  findByName: (object, name) => rowsOf(object).find({ name: { eq: name } }, 'id name active'),
  update: (object, id, data) => rowsOf(object).update(id, data),
  putBack: (object, id, data, reason) => putBack({ objectSingular: object, objectPlural: PLURALS[object], recordId: id, data, reason }),
  destroy: async (object, ids) => {
    await rowsOf(object).destroyMany(ids);
  },
  stillDeleted: async (object, ids) =>
    ids.length === 0
      ? []
      : (
          await rowsOf(object).findIncludingDeleted<{ id: string; deletedAt: string | null; seedKey: string | null }>(
            { id: { in: [...new Set(ids)] } },
            'id deletedAt seedKey',
          )
        ).flatMap((row) => (row.deletedAt === null ? [] : [{ id: row.id, seedKey: row.seedKey }])),
  restoreWithNote: (object, id, reason) => restoreIfStillDeleted({ objectSingular: object, objectPlural: PLURALS[object], recordId: id, reason }),
  firstStageId: async () => {
    const stages = await rowsOf('utmStage').find<{ id: string; sequence: number | null; createdAt: string }>({}, 'id sequence createdAt');

    return (
      [...stages].sort(
        (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      )[0]?.id ?? null
    );
  },
  stageIdsInUse: async (stageIds) =>
    new Set(
      (await rowsOf('utmCampaign').find<{ stageId: string | null }>({ stageId: { in: stageIds } }, 'stageId')).flatMap(({ stageId }) =>
        stageId === null ? [] : [stageId],
      ),
    ),
  clearOnLeads: async (field, ids) => {
    const linked = await leads.find<{ id: string }>({ [field]: { in: ids } }, 'id');

    if (linked.length > 0) {
      await writeLeadsAsApplication(linked.map(({ id }) => ({ leadId: id, data: { [field]: null } })));
    }
  },
  destroyTagLinks: async (field, ids) => {
    const links = await campaignTags.findIncludingDeleted<{ id: string }>({ [field]: { in: ids } }, 'id');

    if (links.length > 0) {
      await campaignTags.destroyMany(links.map(({ id }) => id));
    }
  },
  pickColor: () => pickRandomColor(),
  memberLocale: readMemberLocale,
  translate,
};
