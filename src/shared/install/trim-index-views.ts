import { kv } from 'twenty-sdk/logic-function';

import { PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/shared/claims/claims-universal-identifiers.constant';
import { planIndexViewTrim } from 'src/shared/install/utils/plan-index-view-trim.util';
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
// view-field update, so the columns go one by one until the time is up. Returns the fields hidden.
const hideViewFields = async (fields: ViewField[], stopAt: number) => {
  const hidden: string[] = [];

  for (const field of fields) {
    if (Date.now() >= stopAt) {
      break;
    }
    requireData(
      await twentyMetadata(
        'application',
        `mutation HideColumn($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
        { input: { id: field.id, update: { isVisible: false } } },
      ),
      'Hide column',
    );
    hidden.push(field.fieldMetadataId);
  }

  return hidden;
};

// Returns how many columns are still to hide. A column left for later is not remembered, so the
// next run hides it.
const trimIndexView = async (object: AppObject, stopAt: number) => {
  const fields = await readIndexViewFields(object.id);

  if (fields === null) {
    return 0;
  }
  const key = memoryKey(object.universalIdentifier);
  const stored = await kv.get<unknown>(key, KV_OPTIONS);
  const handled = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  const plan = planIndexViewTrim({
    fields: fields.map((field) => ({
      fieldId: field.fieldMetadataId,
      position: field.position,
      isVisible: field.isVisible,
    })),
    handled,
  });
  const toHide = new Set(plan.hide);
  const hidden = new Set(
    await hideViewFields(
      fields.filter((field) => toHide.has(field.fieldMetadataId)),
      stopAt,
    ),
  );
  const left = new Set(plan.hide.filter((fieldId) => !hidden.has(fieldId)));
  const handledNow = plan.handled.filter((fieldId) => !left.has(fieldId));

  if (handledNow.length !== handled.length) {
    await kv.set(key, handledNow, KV_OPTIONS);
  }

  return left.size;
};

// Twenty's own "All" list of an object shows every field and the app cannot define it. Each
// column is trimmed once and remembered, so a column staff switch back on stays on. Columns not
// reached by `stopAt` are left for the next run; returns how many.
export const trimIndexViews = async (stopAt: number) => {
  const errors = errorCollector();
  let left = 0;

  for (const object of await listAppObjects()) {
    await errors.run(object.nameSingular, async () => {
      left += await trimIndexView(object, stopAt);
    });
  }
  errors.throwIfAny();

  return left;
};
