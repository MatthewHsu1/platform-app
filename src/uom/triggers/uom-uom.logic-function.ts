import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { putBack, restoreWithNote } from 'src/shared/triggers/put-back';
import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { findMany, records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { UOM_UOM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';
import {
  keepsSeedUnitOnDelete,
  planRootFactorPutBack,
  planUomUpdate,
  resolveUoms,
  unitDeleteRefusal,
  unitsReachedByDelete,
} from 'src/uom/utils/uom.util';

type UomRecord = {
  id: string;
  name: string | null;
  relativeUomId: string | null;
  relativeFactor: number;
  seedKey: string | null;
  factor: number | null;
  parentPath: string | null;
  sequence: number | null;
};

const SELECTION = 'id name relativeUomId relativeFactor seedKey factor parentPath sequence';
const OBJECT = { objectSingular: 'uomUom', objectPlural: 'uomUoms' } as const;
const MASTER_DATA_REASON =
  'This unit is kept: other parts of the system use it. Archive it (untick Active) instead of deleting it.';
const uoms = records(OBJECT.objectSingular, OBJECT.objectPlural);
const productTemplates = records('productTemplate', 'productTemplates');
const vendorPrices = records('productSupplierinfo', 'productSupplierinfos');
const packagingBarcodes = records('productUom', 'productUoms');
const packagingLinks = records('productTemplateUomUomRel', 'productTemplateUomUomRels');

// Products in the trash count as deleted; archived ones still count.
const usedUnitIds = async (unitIds: string[]) => {
  const { templates, sellers } = await findMany<{
    templates: { uomId: string | null }[];
    sellers: { productUomId: string | null }[];
  }>({
    templates: { of: productTemplates, filter: { uomId: { in: unitIds } }, selection: 'uomId' },
    sellers: { of: vendorPrices, filter: { productUomId: { in: unitIds } }, selection: 'productUomId' },
  });

  return [...templates.map(({ uomId }) => uomId), ...sellers.map(({ productUomId }) => productUomId)].flatMap(
    (id) => (id === null ? [] : [id]),
  );
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<UomRecord>>) => {
  const { operation, events } = readEvents<UomRecord>(payload);

  const errors = errorCollector();

  if (operation === 'deleted') {
    const removed: string[] = [];
    const batchIds = new Set(events.map((event) => event.recordId));
    // Units deleted together in this batch still count for the cascade reach.
    const stored = await uoms.findIncludingDeleted<{
      id: string;
      relativeUomId: string | null;
      deletedAt: string | null;
    }>({}, 'id relativeUomId deletedAt');
    const remaining = stored.filter((unit) => unit.deletedAt === null || batchIds.has(unit.id));
    const deletedUnitIds = new Set(stored.filter((unit) => unit.deletedAt !== null).map((unit) => unit.id));

    for (const event of events) {
      const before = 'before' in event.properties ? event.properties.before : undefined;

      await errors.run(event.recordId, async () => {
        if (
          before !== undefined &&
          keepsSeedUnitOnDelete({
            seedKey: before.seedKey,
            relativeUomId: before.relativeUomId,
            batchIds,
            deletedUnitIds,
          })
        ) {
          await restoreWithNote({ ...OBJECT, recordId: event.recordId, reason: MASTER_DATA_REASON });
          return;
        }
        const reachedUnitIds = unitsReachedByDelete({ unitId: event.recordId, units: remaining });
        const reason = unitDeleteRefusal({ reachedUnitIds, usedUnitIds: await usedUnitIds(reachedUnitIds) });

        if (reason !== null) {
          await restoreWithNote({ ...OBJECT, recordId: event.recordId, reason });
          return;
        }
        removed.push(event.recordId);
      });
    }
    // The units based on it go with the unit (and so theirs), its
    // packaging barcodes and its product packaging links.
    await errors.run('dependants', () =>
      cascadeDelete({
        parents: uoms,
        parentIds: removed,
        children: [
          { of: uoms, field: 'relativeUomId' },
          { of: packagingBarcodes, field: 'uomId' },
          { of: packagingLinks, field: 'uomUomId' },
        ],
      }),
    );
    errors.throwIfAny();
    return {};
  }

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }

  const all = await uoms.find<UomRecord>({}, SELECTION);
  const { resolved, cycles } = resolveUoms(all);
  const cyclic = new Set(cycles);
  let undone = false;

  for (const event of events) {
    const after = 'after' in event.properties ? event.properties.after : undefined;
    const before = 'before' in event.properties ? event.properties.before : undefined;

    if (after === undefined) {
      continue;
    }

    if (cyclic.has(event.recordId) && before !== undefined && before.relativeUomId !== after.relativeUomId) {
      await errors.run(event.recordId, () =>
        putBack({
          ...OBJECT,
          recordId: event.recordId,
          data: { relativeUomId: before.relativeUomId },
          reason: 'A unit cannot be its own reference unit, also not through other units.',
        }),
      );
      undone = true;
    } else {
      const rootPutBack = planRootFactorPutBack({ before, after });

      if (rootPutBack !== null) {
        await errors.run(event.recordId, () =>
          putBack({
            ...OBJECT,
            recordId: event.recordId,
            data: rootPutBack,
            reason: 'A unit with no reference unit is a reference unit itself, so it must contain exactly 1.',
          }),
        );
        undone = true;
      }
    }
  }

  // The undo writes fire this trigger again, and that pass fills the paths.
  if (undone) {
    errors.throwIfAny();
    return {};
  }

  for (const row of all) {
    const unit = resolved.get(row.id);

    if (unit !== undefined) {
      await errors.run(row.id, () => uoms.update(row.id, planUomUpdate({ row, resolved: unit })));
    }
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: UOM_UOM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-uom-uom',
  description:
    'Keeps each unit absolute quantity and path right, refuses cycles, puts back deleted default units and units products use, and deletes the units, packaging barcodes and packaging links of a deleted unit.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'uomUom.*', batchMode: true },
});
