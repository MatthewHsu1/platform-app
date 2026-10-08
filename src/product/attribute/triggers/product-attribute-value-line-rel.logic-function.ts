import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import {
  moveLinkOffMergedLine,
  removeUnusedTemplateAttributeValues,
  syncLineValues,
} from 'src/product/attribute/sync-line-values';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { type UndoableChange } from 'src/product/utils/plan-undo-change.util';
import { attributeLines, lineValueLinks } from 'src/product/variant/product-records';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { undoChangesOf } from 'src/product/variant/undo-changes';
import { isApplicationWrite, isStaffDelete } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { includingDeleted } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type LineValueLinkEventRecord = {
  id: string;
  productTemplateAttributeLineId: string | null;
  productAttributeValueId: string | null;
  updatedBy?: { source?: string | null } | null;
};

const templatesOfLines = async (lineIds: string[]) =>
  new Map(
    (lineIds.length === 0
      ? []
      : await attributeLines.find<{ id: string; productTmplId: string | null }>(
          includingDeleted({ id: { in: [...new Set(lineIds)] } }),
          'id productTmplId',
        )
    ).map((line) => [line.id, line.productTmplId]),
  );

const handler = async (
  payload: DatabaseEventBatchPayload<ObjectRecordEvent<LineValueLinkEventRecord>>,
) => {
  const { operation, events } = readEvents<LineValueLinkEventRecord>(payload);

  if (operation === 'upserted' || operation === 'destroyed') {
    return {};
  }

  const errors = errorCollector();
  const lineIds: string[] = [];
  const staffChanges: { lineId: string | null; change: UndoableChange }[] = [];

  for (const event of events) {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;

    await errors.run(event.recordId, async () => {
      for (const row of [before, after]) {
        if (row?.productTemplateAttributeLineId) {
          lineIds.push(row.productTemplateAttributeLineId);
        }
      }
      if (operation === 'created' && after !== undefined) {
        const lineId = await moveLinkOffMergedLine(after);
        if (lineId !== null && lineId !== after.productTemplateAttributeLineId) {
          lineIds.push(lineId);
        } else if (!isApplicationWrite(after)) {
          staffChanges.push({
            lineId,
            change: { kind: 'lineValueLinkCreated', recordId: event.recordId },
          });
        }
      }
      if (operation === 'deleted' && isStaffDelete(event)) {
        staffChanges.push({
          lineId: before?.productTemplateAttributeLineId ?? null,
          change: { kind: 'lineValueLinkDeleted', recordId: event.recordId },
        });
      }
    });
  }

  await errors.run('reconcile', async () => {
    const templateOfLine = await templatesOfLines(
      staffChanges.flatMap(({ lineId }) => (lineId === null ? [] : [lineId])),
    );
    const { templateIds, removed } = await syncLineValues(lineIds, errors);
    await reconcileTemplates(
      templateIds,
      {
        variants: true,
        undoChange: undoChangesOf(
          staffChanges.map(({ lineId, change }) => ({
            templateId: lineId === null ? null : templateOfLine.get(lineId),
            change,
          })),
        ),
      },
      errors,
    );
    await errors.run('cleanup', () => removeUnusedTemplateAttributeValues(removed));
  });

  // Runs last: a link the undo above brought back is no longer deleted.
  if (operation === 'deleted') {
    await errors.run('destroy', () =>
      lineValueLinks.destroySoftDeleted(events.map((event) => event.recordId)),
    );
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productAttributeValueLineRel,
  name: 'platform-product-attribute-value-line-rel',
  description:
    'Adds or removes a product attribute value and the variants when a value is added to or removed from an attribute line.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productAttributeValueLineRel.*', batchMode: true },
});
