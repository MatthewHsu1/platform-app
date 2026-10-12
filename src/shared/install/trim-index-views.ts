import { kv } from 'twenty-sdk/logic-function';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { readLeadObject } from 'src/crm/lead/read-lead-object';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { leadListColumnNames } from 'src/crm/lead/views/lead-list-columns';
import { PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/shared/claims/claims-universal-identifiers.constant';
import { type IndexViewTrimResult } from 'src/shared/install/types/index-view-trim-result.type';
import { orderTrimLists } from 'src/shared/install/utils/order-trim-lists.util';
import { planIndexViewTrim, settleIndexViewTrim } from 'src/shared/install/utils/plan-index-view-trim.util';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const KV_OPTIONS = { scope: 'WORKSPACE' } as const;

type AppObject = { id: string; universalIdentifier: string; nameSingular: string; applicationId: string };

type ViewField = {
  id: string;
  fieldMetadataId: string;
  position: number;
  isVisible: boolean;
  isActive: boolean;
  deletedAt: string | null;
};

// The lead list is the one staff open most, so it is trimmed before the others.
const TRIM_FIRST = [CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER];

const memoryKey = (objectUniversalIdentifier: string) => `index-view-trim:${objectUniversalIdentifier}`;

// Every object of this app shares the application of the claim object, which the app always has.
const listAppObjects = async (): Promise<AppObject[]> => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: AppObject }[] } }>(
      'application',
      `{ objects(paging: { first: 1000 }) { edges { node { id universalIdentifier nameSingular applicationId } } } }`,
    ),
    'List objects',
  );
  const objects = data.objects.edges.map((edge) => edge.node);
  const applicationId = objects.find(
    (object) => object.universalIdentifier === PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER,
  )?.applicationId;

  if (applicationId === undefined) {
    throw new Error('The app objects were not found: the claim object is missing.');
  }

  return objects.filter((object) => object.applicationId === applicationId);
};

const readIndexViewFields = async (objectMetadataId: string): Promise<ViewField[] | null> => {
  const data = requireData(
    await twentyMetadata<{ getViews: { key: string | null; viewFields: ViewField[] }[] }>(
      'application',
      `query IndexView($objectMetadataId: String) {
        getViews(objectMetadataId: $objectMetadataId) {
          key viewFields { id fieldMetadataId position isVisible isActive deletedAt }
        }
      }`,
      { objectMetadataId },
    ),
    'List views',
  );
  const indexView = data.getViews.find((view) => view.key === 'INDEX');

  return indexView === undefined
    ? null
    : indexView.viewFields.filter((field) => field.isActive && field.deletedAt === null);
};

// Twenty runs one updateViewField per request (a second alias of it is refused) and has no bulk
// view-field update, so the columns go one by one until the time is up. Returns the fields changed.
const setViewFieldsVisible = async (fields: ViewField[], isVisible: boolean, stopAt: number) => {
  const changed: string[] = [];

  for (const field of fields) {
    if (Date.now() >= stopAt) {
      break;
    }
    requireData(
      await twentyMetadata(
        'application',
        `mutation SetColumnVisibility($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
        { input: { id: field.id, update: { isVisible } } },
      ),
      'Change column',
    );
    changed.push(field.fieldMetadataId);
  }

  return changed;
};

// The lead list shows its own nine columns, chosen by field, so the monthly recurring amount is
// the tenth when recurring revenues are on. Other lists keep their first ten.
const readOnlyColumns = async (object: AppObject): Promise<string[] | undefined> => {
  if (object.universalIdentifier !== CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER) {
    return undefined;
  }
  const { fieldsList } = await readLeadObject();
  const names = leadListColumnNames((await readCrmSettings()).useRecurringRevenues);

  return fieldsList.filter((field) => names.includes(field.name)).map((field) => field.id);
};

// Returns how many columns are still to change.
const trimIndexView = async (object: AppObject, stopAt: number) => {
  const fields = await readIndexViewFields(object.id);

  if (fields === null) {
    return 0;
  }
  const only = await readOnlyColumns(object);
  const key = memoryKey(object.universalIdentifier) + (only === undefined ? '' : ':columns');
  const stored = await kv.get<unknown>(key, KV_OPTIONS);
  const handled = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  const plan = planIndexViewTrim({
    fields: fields.map((field) => ({
      fieldId: field.fieldMetadataId,
      position: field.position,
      isVisible: field.isVisible,
    })),
    handled,
    only,
  });
  const toHide = new Set(plan.hide);
  const toShow = new Set(plan.show);
  const changed = [
    ...(await setViewFieldsVisible(fields.filter((field) => toHide.has(field.fieldMetadataId)), false, stopAt)),
    ...(await setViewFieldsVisible(fields.filter((field) => toShow.has(field.fieldMetadataId)), true, stopAt)),
  ];
  const progress = settleIndexViewTrim({ plan, hidden: changed });

  if (progress.handled.length !== handled.length) {
    await kv.set(key, progress.handled, KV_OPTIONS);
  }

  return progress.left.length;
};

// Twenty's own "All" list of an object shows every field and the app cannot define it. Each
// column is trimmed once and remembered, so a column staff switch back on stays on. Columns and
// lists not reached by `stopAt` are left for the next run. `onlyLeads` trims the lead list alone.
export const trimIndexViews = async (stopAt: number, { onlyLeads = false }: { onlyLeads?: boolean } = {}): Promise<IndexViewTrimResult> => {
  const errors = errorCollector();
  const objects = orderTrimLists(await listAppObjects(), TRIM_FIRST, { onlyFirst: onlyLeads });
  let columnsLeft = 0;
  let reached = 0;

  for (const object of objects) {
    if (Date.now() >= stopAt) {
      break;
    }
    reached += 1;
    await errors.run(object.nameSingular, async () => {
      columnsLeft += await trimIndexView(object, stopAt);
    });
  }
  errors.throwIfAny();

  return { columnsLeft, listsNotReached: objects.length - reached };
};
