import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import {
  archiveDeletedLineInUse,
  clearLineValues,
  findLineIncludingDeleted,
  isMergedAway,
  mergeIntoArchivedLine,
  removeUnusedTemplateAttributeValues,
  syncLineValues,
} from 'src/product/attribute/sync-line-values';
import { PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { type UndoableChange } from 'src/product/utils/plan-undo-change.util';
import { reconcileTemplates } from 'src/product/variant/reconcile-variants';
import { undoChangesOf } from 'src/product/variant/undo-changes';
import { isApplicationWrite, isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type LineEventRecord = {
  id: string;
  active: boolean;
  sequence: number | null;
  productTmplId: string | null;
  attributeId: string | null;
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};

const MOVE_REASON =
  'An attribute line stays on its product and attribute. Remove it and add a new one.';

const VARIANT_FIELDS = ['active', 'sequence', 'productTmplId', 'attributeId'] as const;

// A line cannot move to another product or attribute.
const putBackMove = async (before: LineEventRecord, after: LineEventRecord) => {
  const moved = (['productTmplId', 'attributeId'] as const).filter(
    (field) => before[field] !== null && before[field] !== after[field],
  );

  if (moved.length === 0 || isApplicationWrite(after)) {
    return false;
  }
  const stored = await findLineIncludingDeleted(after.id);
  const data = Object.fromEntries(
    moved
      .filter((field) => stored !== undefined && stored[field] !== before[field])
      .map((field) => [field, before[field]]),
  );

  if (Object.keys(data).length === 0) {
    return false;
  }
  await putBack({
    objectSingular: 'productTemplateAttributeLine',
    objectPlural: 'productTemplateAttributeLines',
    recordId: after.id,
    data,
    reason: MOVE_REASON,
  });
  return true;
};

const lineToSync = async (after: LineEventRecord, isNew: boolean) =>
  isNew && after.productTmplId !== null && after.attributeId !== null
    ? mergeIntoArchivedLine({
        id: after.id,
        productTmplId: after.productTmplId,
        attributeId: after.attributeId,
      })
    : after.id;

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LineEventRecord>>) => {
  const { operation, events } = readEvents<LineEventRecord>(payload);
  const errors = errorCollector();
  const lineIds: string[] = [];
  const deletedLineIds: string[] = [];
  const archivedLines: { lineId: string; archivedAt: string }[] = [];
  const staffChanges: { templateId: string | null; change: UndoableChange }[] = [];

  for (const event of events) {
    const before = 'before' in event.properties ? event.properties.before : undefined;
    const after = 'after' in event.properties ? event.properties.after : undefined;
    const byStaff = isStaffChange(operation, event, after);

    await errors.run(event.recordId, async () => {
      if (operation === 'deleted') {
        lineIds.push(event.recordId);
        // A merged-away line never existed: it is neither archived
        // in place nor brought back.
        if (await isMergedAway(await findLineIncludingDeleted(event.recordId))) {
          return;
        }
        deletedLineIds.push(event.recordId);
        if (byStaff) {
          staffChanges.push({
            templateId: before?.productTmplId ?? after?.productTmplId ?? null,
            change: { kind: 'lineDeleted', recordId: event.recordId },
          });
        }
      } else if ((operation === 'created' || operation === 'restored') && after !== undefined) {
        const lineId = await lineToSync(after, operation === 'created');
        lineIds.push(lineId);
        if (operation === 'created' && byStaff && lineId === after.id) {
          staffChanges.push({
            templateId: after.productTmplId,
            change: { kind: 'lineCreated', recordId: after.id },
          });
        }
      } else if (operation === 'updated' && before !== undefined && after !== undefined) {
        if (await putBackMove(before, after)) {
          return;
        }
        if (VARIANT_FIELDS.every((field) => before[field] === after[field])) {
          return;
        }
        const completedNow =
          (before.productTmplId === null || before.attributeId === null) && byStaff;
        lineIds.push(await lineToSync(after, completedNow));
        if (before.active && !after.active) {
          archivedLines.push({ lineId: after.id, archivedAt: after.updatedAt ?? new Date().toISOString() });
          if (byStaff) {
            staffChanges.push({
              templateId: after.productTmplId,
              change: { kind: 'lineArchived', recordId: after.id },
            });
          }
        }
      }
    });
  }

  const undoChange = undoChangesOf(staffChanges);
  const undone = new Set<string>();
  const { templateIds, removed } = await syncLineValues(lineIds, errors);
  await reconcileTemplates(
    templateIds,
    {
      variants: true,
      undoChange: async (templateId) => {
        const result = await undoChange(templateId);
        if (result.attempted > 0) {
          undone.add(templateId);
        }
        return result;
      },
    },
    errors,
  );
  await errors.run('cleanup', () => removeUnusedTemplateAttributeValues(removed));

  for (const lineId of deletedLineIds) {
    await errors.run(lineId, () => archiveDeletedLineInUse(lineId));
  }
  for (const { lineId, archivedAt } of archivedLines) {
    await errors.run(lineId, async () => {
      const line = await findLineIncludingDeleted(lineId);
      if (
        line !== undefined &&
        !line.active &&
        !undone.has(line.productTmplId ?? '') &&
        !(await isMergedAway(line))
      ) {
        await clearLineValues(lineId, archivedAt);
      }
    });
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier:
    PRODUCT_VARIANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplateAttributeLine,
  name: 'platform-product-template-attribute-line',
  description:
    "Keeps the product attribute values and variants in step with a product's attribute lines, and refuses moving a line.",
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplateAttributeLine.*', batchMode: true },
});
