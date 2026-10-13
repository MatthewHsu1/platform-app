import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { templatesOfExclusions } from 'src/product/attribute/exclusion-templates';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { undoChangesOf } from 'src/product/variant/undo-changes';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type UndoableChange } from 'src/product/utils/types/undoable-change.type';

type ExclusionEventRecord = {
  id: string;
  productTmplId: string | null;
  productTemplateAttributeValueId: string | null;
  updatedBy?: { source?: string | null } | null;
};

type StaffChange = { templateId: string | null; change: UndoableChange };

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<ExclusionEventRecord>>,
) => {
  const { operation, events } = readEvents<ExclusionEventRecord>(payload);

  if (operation === 'upserted' || operation === 'destroyed') {
    return {};
  }

  // The app's own name write changes neither field, so it stops here.
  const relevant = events.flatMap((event) => {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;
    const moved =
      before?.productTmplId !== after?.productTmplId ||
      before?.productTemplateAttributeValueId !== after?.productTemplateAttributeValueId;

    return operation !== 'updated' || moved ? [{ recordId: event.recordId, before, after }] : [];
  });
  const staffChanges = relevant.flatMap(({ recordId, before, after }): StaffChange[] => {
    if (after === undefined || isApplicationWrite(after)) {
      return [];
    }
    if (operation === 'created') {
      return [
        {
          templateId: after.productTmplId,
          change: { kind: 'exclusionCreated' as const, recordId },
        },
      ];
    }
    if (operation === 'updated' && before !== undefined) {
      const change = {
        kind: 'exclusionUpdated' as const,
        recordId,
        before: {
          productTmplId: before.productTmplId,
          productTemplateAttributeValueId: before.productTemplateAttributeValueId,
        },
      };
      return [
        { templateId: after.productTmplId, change },
        { templateId: before.productTmplId, change },
      ];
    }
    return [];
  });
  const rows = relevant.flatMap(({ before, after }) =>
    [before, after].flatMap((row) => (row === undefined ? [] : [row])),
  );

  const errors = errorCollector();
  await errors.run('reconcile', async () =>
    reconcileTemplates(
      await templatesOfExclusions(rows),
      { variants: true, undoChange: undoChangesOf(staffChanges) },
      errors,
    ),
  );

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplateAttributeExclusion,
  name: 'platform-product-template-attribute-exclusion',
  description: 'Reconciles the variants of the products an exclusion is about, and names it.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'productTemplateAttributeExclusion.*',
    batchMode: true,
  },
});
