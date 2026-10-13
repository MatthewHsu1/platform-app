import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type UtmNameRules } from 'src/utm/types/utm-name-rules.type';
import { type UtmNamedObject } from 'src/utm/types/utm-named-object.type';
import { type UtmRow } from 'src/utm/types/utm-row.type';
import { type UtmTriggerApi } from 'src/utm/types/utm-trigger-api.type';
import { UTM_MESSAGES } from 'src/utm/utm-messages';
import { emptiedRequiredFields, findNameClash, planCampaignDefaults, planUniqueNameCreate } from 'src/utm/utils/plan-utm-names.util';
import { splitNameAndCount } from 'src/utm/utils/unique-names.util';

type UtmEvent = {
  recordId: string;
  workspaceMemberId?: string;
  properties: { before?: Record<string, unknown>; after?: Record<string, unknown>; updatedFields?: string[] };
};

type Run = { operation: RecordOperation; events: UtmEvent[] };

const textOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

const createdRows = (events: UtmEvent[]) =>
  events.flatMap((event) => (event.properties.after === undefined ? [] : [{ event, row: event.properties.after }]));

const otherRows = async (api: UtmTriggerApi, object: UtmNamedObject, created: { id: string; name: string | null }[]) => {
  const createdIds = new Set(created.map((row) => row.id));
  const bases = created.flatMap((row) => (row.name === null ? [] : [splitNameAndCount(row.name)[0]])).filter((base) => base !== '');

  return bases.length === 0 ? [] : (await api.findNamesLike(object, [...new Set(bases)])).filter((row) => !createdIds.has(row.id));
};

const namesOf = (rows: UtmRow[], keep: (row: UtmRow) => boolean) => rows.flatMap((row) => (keep(row) && row.name !== null ? [row.name] : []));

// A name an archived row holds cannot be stored twice, and one save of several
// rows stands or falls as a whole: when one row clashes, every row of the save
// is removed, and the run's error says why, since a removed row has no page to
// hold a note.
const refuseWholeCreate = async (
  api: UtmTriggerApi,
  object: UtmNamedObject,
  rows: { id: string; name: string | null; event: UtmEvent }[],
  refusedIds: Set<string>,
) => {
  const refused = rows.filter((row) => refusedIds.has(row.id));

  await api.destroy(
    object,
    rows.map((row) => row.id),
  );

  const locale = await api.memberLocale(refused[0].event.workspaceMemberId);

  throw new Error(refused.map((row) => api.translate(locale, UTM_MESSAGES.archivedName, { name: row.name ?? '' })).join(' '));
};

// Twenty's UI saves a new row before its name is typed, so the first name a
// row without one gets counts as its create: the counter numbers it. A name an
// archived row holds cannot be stored twice: it is put back, the row stays
// without a name.
const numberFirstName = async (api: UtmTriggerApi, object: UtmNamedObject, archivedHoldNames: boolean, event: UtmEvent) => {
  const row = { id: event.recordId, name: textOf(event.properties.after?.name) };
  const others = await otherRows(api, object, [row]);
  const [plan] = planUniqueNameCreate({
    created: [row],
    existingNames: namesOf(others, (other) => !archivedHoldNames || other.active !== false),
    archivedNames: archivedHoldNames ? namesOf(others, (other) => other.active === false) : [],
  });

  if (plan?.kind === 'refuse') {
    await api.putBack(
      object,
      event.recordId,
      { name: null },
      api.translate(await api.memberLocale(event.workspaceMemberId), UTM_MESSAGES.nameTaken, { name: row.name ?? '' }),
    );
  } else if (plan?.kind === 'write') {
    await api.update(object, event.recordId, { name: plan.name });
  }
};

const isFirstName = (event: UtmEvent) => textOf(event.properties.before?.name) === null && textOf(event.properties.after?.name) !== null;

// A staff save that gives a name another row holds is put back: names are unique.
const putBackTakenName = async (api: UtmTriggerApi, object: UtmNamedObject, event: UtmEvent) => {
  const name = textOf(event.properties.after?.name);

  if (name === null) {
    return false;
  }
  if (!findNameClash(name, await api.findByName(object, name), event.recordId)) {
    return false;
  }
  await api.putBack(
    object,
    event.recordId,
    { name: textOf(event.properties.before?.name) },
    api.translate(await api.memberLocale(event.workspaceMemberId), UTM_MESSAGES.nameTaken, { name }),
  );

  return true;
};

const staffNameWrites = (events: UtmEvent[]) =>
  events.filter(
    (event) =>
      event.properties.before !== undefined &&
      !isApplicationWrite(event.properties.after) &&
      (event.properties.updatedFields ?? []).includes('name'),
  );

// New campaigns get a unique identifier, the creator as responsible and the
// first stage; the first name typed into a campaign saved without one is
// numbered the same way. A staff save that empties one of them, or takes
// another campaign's identifier, is put back. A deleted campaign leaves its leads and
// its tag links.
export const makeRunCampaignTrigger =
  (api: UtmTriggerApi) =>
  async ({ operation, events }: Run) => {
    const errors = errorCollector();

    if (operation === 'created') {
      const rows = createdRows(events).map(({ event, row }) => ({
        event,
        id: event.recordId,
        name: textOf(row.name),
        responsibleId: textOf(row.responsibleId),
        stageId: textOf(row.stageId),
        creatorMemberId: event.workspaceMemberId ?? textOf((row.createdBy as { workspaceMemberId?: unknown } | null | undefined)?.workspaceMemberId),
      }));
      const others = await otherRows(api, 'utmCampaign', rows);
      const plans = planCampaignDefaults({
        created: rows,
        existingActiveNames: namesOf(others, (row) => row.active !== false),
        archivedNames: namesOf(others, (row) => row.active === false),
        firstStageId: await api.firstStageId(),
      });

      const refusedIds = new Set(plans.flatMap((plan) => (plan.kind === 'refuse' ? [plan.id] : [])));

      if (refusedIds.size > 0) {
        await errors.run('refused', () => refuseWholeCreate(api, 'utmCampaign', rows, refusedIds));
      } else {
        for (const plan of plans) {
          if (plan.kind === 'write' && Object.keys(plan.data).length > 0) {
            await errors.run(plan.id, () => api.update('utmCampaign', plan.id, plan.data));
          }
        }
      }
    }

    if (operation === 'updated') {
      for (const event of events.filter((candidate) => candidate.properties.before !== undefined && !isApplicationWrite(candidate.properties.after))) {
        await errors.run(event.recordId, async () => {
          const values = (side: Record<string, unknown> | undefined) => ({
            name: textOf(side?.name),
            responsibleId: textOf(side?.responsibleId),
            stageId: textOf(side?.stageId),
          });
          const before = values(event.properties.before);
          const emptied = emptiedRequiredFields(before, values(event.properties.after));

          if (emptied.length > 0) {
            await api.putBack(
              'utmCampaign',
              event.recordId,
              Object.fromEntries(emptied.map((field) => [field, before[field]])),
              api.translate(await api.memberLocale(event.workspaceMemberId), UTM_MESSAGES.requiredEmptied),
            );
            return;
          }
          if ((event.properties.updatedFields ?? []).includes('name')) {
            await (isFirstName(event) ? numberFirstName(api, 'utmCampaign', true, event) : putBackTakenName(api, 'utmCampaign', event));
          }
        });
      }
    }

    if (operation === 'deleted') {
      const allowed = (
        await api.stillDeleted(
          'utmCampaign',
          events.map((event) => event.recordId),
        )
      ).map((row) => row.id);

      if (allowed.length > 0) {
        await errors.run('leads', () => api.clearOnLeads('campaignId', allowed));
        await errors.run('tags', () => api.destroyTagLinks('campaignId', allowed));
      }
    }

    errors.throwIfAny();
  };

// Sources and mediums: a new row, or the first name typed into a row saved
// without one, gets a unique name through the counter, a staff rename to a
// taken name is put back, the default rows other parts rely
// on cannot be deleted, and a deleted row leaves its leads.
export const makeRunUtmNameTrigger =
  (rules: UtmNameRules, api: UtmTriggerApi) =>
  async ({ operation, events }: Run) => {
    const errors = errorCollector();

    if (operation === 'created') {
      const rows = createdRows(events).map(({ event, row }) => ({ event, id: event.recordId, name: textOf(row.name) }));
      const others = await otherRows(api, rules.object, rows);
      const plans = planUniqueNameCreate({
        created: rows,
        existingNames: namesOf(others, (row) => !rules.archivedHoldNames || row.active !== false),
        archivedNames: rules.archivedHoldNames ? namesOf(others, (row) => row.active === false) : [],
      });

      const refusedIds = new Set(plans.flatMap((plan) => (plan.kind === 'refuse' ? [plan.id] : [])));

      if (refusedIds.size > 0) {
        await errors.run('refused', () => refuseWholeCreate(api, rules.object, rows, refusedIds));
      } else {
        for (const plan of plans) {
          if (plan.kind === 'write') {
            await errors.run(plan.id, () => api.update(rules.object, plan.id, { name: plan.name }));
          }
        }
      }
    }

    if (operation === 'updated') {
      for (const event of staffNameWrites(events)) {
        await errors.run(event.recordId, () =>
          isFirstName(event) ? numberFirstName(api, rules.object, rules.archivedHoldNames, event) : putBackTakenName(api, rules.object, event),
        );
      }
    }

    if (operation === 'deleted') {
      const deleted = await api.stillDeleted(
        rules.object,
        events.map((event) => event.recordId),
      );
      const refused = deleted.filter((row) => row.seedKey !== null && rules.protectedSeedKeys.includes(row.seedKey));

      for (const row of refused) {
        const event = events.find((candidate) => candidate.recordId === row.id);

        await errors.run(row.id, async () =>
          api.restoreWithNote(rules.object, row.id, api.translate(await api.memberLocale(event?.workspaceMemberId), rules.protectedMessage)),
        );
      }

      const allowed = deleted.filter((row) => !refused.includes(row)).map((row) => row.id);

      if (allowed.length > 0) {
        await errors.run('leads', () => api.clearOnLeads(rules.leadField, allowed));
      }
    }

    errors.throwIfAny();
  };

// A campaign stage stays while a campaign, archived or not, is in it.
export const makeRunUtmStageTrigger =
  (api: UtmTriggerApi) =>
  async ({ operation, events }: Run) => {
    if (operation !== 'deleted') {
      return;
    }

    const errors = errorCollector();
    const deleted = await api.stillDeleted(
      'utmStage',
      events.map((event) => event.recordId),
    );
    const used = await api.stageIdsInUse(deleted.map((row) => row.id));

    for (const row of deleted.filter((candidate) => used.has(candidate.id))) {
      const event = events.find((candidate) => candidate.recordId === row.id);

      await errors.run(row.id, async () =>
        api.restoreWithNote('utmStage', row.id, api.translate(await api.memberLocale(event?.workspaceMemberId), UTM_MESSAGES.stageInUse)),
      );
    }

    errors.throwIfAny();
  };

// A new tag without a colour gets one at random; a deleted tag loses its
// campaign links.
export const makeRunUtmTagTrigger =
  (api: UtmTriggerApi) =>
  async ({ operation, events }: Run) => {
    const errors = errorCollector();

    if (operation === 'created') {
      for (const { event } of createdRows(events).filter(({ row }) => textOf(row.color) === null)) {
        await errors.run(event.recordId, () => api.update('utmTag', event.recordId, { color: api.pickColor() }));
      }
    }

    if (operation === 'deleted') {
      const allowed = (
        await api.stillDeleted(
          'utmTag',
          events.map((event) => event.recordId),
        )
      ).map((row) => row.id);

      if (allowed.length > 0) {
        await errors.run('links', () => api.destroyTagLinks('tagId', allowed));
      }
    }

    errors.throwIfAny();
  };
