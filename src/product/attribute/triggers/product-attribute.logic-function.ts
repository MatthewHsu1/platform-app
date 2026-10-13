import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { attributeHasLines, isAttributeUsed } from 'src/product/attribute/attribute-usage';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { attributeChangeRefusal } from 'src/product/utils/guards.util';
import { productAttributes, productAttributeValues } from 'src/product/variant/product-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack, restoreWithNote } from 'src/shared/triggers/put-back';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { sameValue } from 'src/shared/utils/same-value.util';

type AttributeEventRecord = {
  id: string;
  active: boolean;
  createVariant: string | null;
  deletedAt?: string | null;
  updatedBy?: { source?: string | null } | null;
};

const GUARDED_FIELDS = ['active', 'createVariant'] as const;
const OBJECT = { objectSingular: 'productAttribute', objectPlural: 'productAttributes' } as const;

const guard = async (
  operation: 'updated' | 'deleted',
  event: ObjectRecordEvent<AttributeEventRecord>,
) => {
  const before = 'before' in event.properties ? event.properties.before : undefined;
  const after = 'after' in event.properties ? event.properties.after : undefined;

  // The app never deletes these rows, so every delete is guarded.
  if (before === undefined || (operation === 'updated' && isApplicationWrite(after))) {
    return;
  }
  // Only archiving is refused; unarchiving is allowed.
  const changedFields =
    operation === 'updated'
      ? GUARDED_FIELDS.filter((field) =>
          field === 'active'
            ? before.active && after?.active === false
            : !sameValue(before[field], after?.[field]),
        )
      : [];

  if (operation === 'updated' && changedFields.length === 0) {
    return;
  }
  const reason = attributeChangeRefusal({
    usedOnProducts: await isAttributeUsed(event.recordId),
    hasLines: operation === 'deleted' && (await attributeHasLines(event.recordId)),
    changedFields: [...changedFields],
    operation,
  });

  if (reason === null) {
    return;
  }
  const [stored] = await productAttributes.findIncludingDeleted<AttributeEventRecord>(
    { id: { eq: event.recordId } },
    'id active createVariant deletedAt',
  );

  if (stored === undefined) {
    return;
  }
  if (operation === 'deleted') {
    if (stored.deletedAt !== null && stored.deletedAt !== undefined) {
      await restoreWithNote({ ...OBJECT, recordId: event.recordId, reason });
    }
    return;
  }
  const data = Object.fromEntries(
    changedFields
      .filter((field) => !sameValue(stored[field], before[field]))
      .map((field) => [field, before[field]]),
  );

  if (Object.keys(data).length > 0) {
    await putBack({ ...OBJECT, recordId: event.recordId, data, reason });
  }
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<AttributeEventRecord>>,
) => {
  const { operation, events } = readEvents<AttributeEventRecord>(payload);

  if (operation !== 'updated' && operation !== 'deleted') {
    return {};
  }

  const errors = errorCollector();
  const guarded: string[] = [];

  for (const event of events) {
    await errors.run(event.recordId, async () => {
      await guard(operation, event);
      guarded.push(event.recordId);
    });
  }
  // Only an attribute no line names stays deleted, and its values go with it.
  if (operation === 'deleted') {
    await errors.run('values', () =>
      cascadeDelete({
        parents: productAttributes,
        parentIds: guarded,
        children: [{ of: productAttributeValues, field: 'attributeId' }],
      }),
    );
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productAttribute,
  name: 'platform-product-attribute',
  description:
    'Refuses deleting an attribute any attribute line names, archiving one that products use, and changing its variant creation mode; deletes the values of a deleted attribute.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productAttribute.*', batchMode: true },
});
