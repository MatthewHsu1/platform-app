import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { templatesOfExclusions } from 'src/product/attribute/exclusion-templates';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { exclusionLinks, exclusions } from 'src/product/variant/product-records';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { undoChangesOf } from 'src/product/variant/undo-changes';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type ExclusionLinkEventRecord = {
  id: string;
  productTemplateAttributeExclusionId: string | null;
  updatedBy?: { source?: string | null } | null;
};

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<ExclusionLinkEventRecord>>,
) => {
  const { operation, events } = readEvents<ExclusionLinkEventRecord>(payload);

  if (operation === 'upserted' || operation === 'destroyed') {
    return {};
  }

  const errors = errorCollector();
  const exclusionIds = events.flatMap((event) =>
    [
      'before' in event.properties ? event.properties.before : undefined,
      'after' in event.properties ? event.properties.after : undefined,
    ].flatMap((row) => row?.productTemplateAttributeExclusionId ?? []),
  );
  const created = events.flatMap((event) => {
    const after = 'after' in event.properties ? event.properties.after : undefined;
    return operation === 'created' && after !== undefined && !isApplicationWrite(after)
      ? [after]
      : [];
  });
  await errors.run('reconcile', async () => {
    const templateOfExclusion = new Map(
      (created.length === 0
        ? []
        : await exclusions.findIncludingDeleted<{ id: string; productTmplId: string | null }>(
            { id: { in: created.flatMap((row) => row.productTemplateAttributeExclusionId ?? []) } },
            'id productTmplId',
          )
      ).map((exclusion) => [exclusion.id, exclusion.productTmplId]),
    );

    await reconcileTemplates(
      await templatesOfExclusions([], exclusionIds),
      {
        variants: true,
        undoChange: undoChangesOf(
          created.map((row) => ({
            templateId: templateOfExclusion.get(row.productTemplateAttributeExclusionId ?? ''),
            change: { kind: 'exclusionLinkCreated' as const, recordId: row.id },
          })),
        ),
      },
      errors,
    );
  });

  if (operation === 'deleted') {
    await errors.run('destroy', () =>
      exclusionLinks.destroySoftDeleted(events.map((event) => event.recordId)),
    );
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productAttrExclusionValueIdsRel,
  name: 'platform-product-attr-exclusion-value-ids-rel',
  description: 'Reconciles the variants when a value is added to or removed from an exclusion.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productAttrExclusionValueIdsRel.*', batchMode: true },
});
