import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { attributeHasLines, readValueUsage } from 'src/product/attribute/attribute-usage';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { attributeValueChangeRefusal } from 'src/product/utils/guards.util';
import { productAttributes, productAttributeValues } from 'src/product/variant/product-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack, restoreWithNote } from 'src/shared/triggers/put-back';
import { forEachReportingErrors } from 'src/shared/triggers/retry-on-conflict';

type ValueEventRecord = {
  id: string;
  active: boolean;
  attributeId: string | null;
  deletedAt?: string | null;
  updatedBy?: { source?: string | null } | null;
};

const OBJECT = { objectSingular: 'productAttributeValue', objectPlural: 'productAttributeValues' } as const;
const ARCHIVED_INSTEAD_REASON = 'Archived instead of deleted: archived variants still use this value.';

// The values of a deleted attribute are deleted with it, which skips the
// value's own delete checks. An attribute a line
// still names comes back, so its values stay guarded.
const isDeletedWithAttribute = async (attributeId: string | null) => {
  if (attributeId === null) {
    return false;
  }
  const [attribute] = await productAttributes.findIncludingDeleted<{ deletedAt: string | null }>(
    { id: { eq: attributeId } },
    'deletedAt',
  );

  return (
    attribute !== undefined &&
    attribute.deletedAt !== null &&
    !(await attributeHasLines(attributeId))
  );
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<ValueEventRecord>>,
) => {
  const { operation, events } = readEvents<ValueEventRecord>(payload);

  if (operation !== 'updated' && operation !== 'deleted') {
    return {};
  }

  await forEachReportingErrors(events, async (event) => {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    // Every delete is guarded, whoever made it, except the cascade of a
    // deleted attribute.
    if (before === undefined || (operation === 'updated' && isApplicationWrite(after))) {
      return;
    }
    if (operation === 'deleted' && (await isDeletedWithAttribute(before.attributeId))) {
      return;
    }
    const moved = operation === 'updated' && before.attributeId !== after?.attributeId;

    if (operation === 'updated' && !moved) {
      return;
    }
    const usage = await readValueUsage(event.recordId);
    const outcome = attributeValueChangeRefusal({
      ...usage,
      changedFields: moved ? ['attributeId'] : [],
      operation,
    });

    if (outcome === null) {
      return;
    }
    const [stored] = await productAttributeValues.findIncludingDeleted<ValueEventRecord>(
      { id: { eq: event.recordId } },
      'id active attributeId deletedAt',
    );

    if (stored === undefined) {
      return;
    }
    if (operation === 'updated') {
      if (outcome.kind === 'refuse' && stored.attributeId !== before.attributeId) {
        await putBack({
          ...OBJECT,
          recordId: event.recordId,
          data: { attributeId: before.attributeId },
          reason: outcome.reason,
        });
      }
      return;
    }
    if (stored.deletedAt === null || stored.deletedAt === undefined) {
      return;
    }
    if (outcome.kind === 'refuse') {
      await restoreWithNote({ ...OBJECT, recordId: event.recordId, reason: outcome.reason });
    } else {
      await restoreWithNote({ ...OBJECT, recordId: event.recordId, reason: ARCHIVED_INSTEAD_REASON });
      await productAttributeValues.update(event.recordId, { active: false });
    }
  });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productAttributeValue,
  name: 'platform-product-attribute-value',
  description:
    'Refuses deleting a value that active products use (archives it when only archived ones do) and moving a used value to another attribute.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productAttributeValue.*', batchMode: true },
});
