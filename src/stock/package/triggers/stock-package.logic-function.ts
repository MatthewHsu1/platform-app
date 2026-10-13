import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { nextNumber, nextNumberByCode } from 'src/base/sequence/next-number';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { packageEdits } from 'src/stock/package/package-edits';
import { pickingsWeighingPackages } from 'src/stock/package/read-shipping-weight-input';
import { stockPackages } from 'src/stock/package/package-records';
import { readPackageSubtree, writePackageSubtree } from 'src/stock/package/rebuild-package-names';
import { type PackageEventRecord } from 'src/stock/package/types/package-event-record.type';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { irSequences } from 'src/stock/stock-records';
import { STOCK_PACKAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { PACKAGE_RECURSION_REASON } from 'src/stock/utils/plan-package-tree.util';

type PackageEvent = ObjectRecordEvent<PackageEventRecord>;

const OBJECT = { objectSingular: 'stockPackage', objectPlural: 'stockPackages' } as const;
const PACKAGE_SEQUENCE_CODE = 'stock.package';

// One change per package: its state before the batch's first event and its last event.
const packageChanges = (events: PackageEvent[]) => {
  const byPackage = new Map<string, { before: PackageEventRecord | undefined; last: PackageEvent }>();

  for (const event of events) {
    const known = byPackage.get(event.recordId);

    byPackage.set(event.recordId, { before: known === undefined ? eventBefore(event) : known.before, last: event });
  }
  return byPackage;
};

// A package saved without a name, or whose name was emptied, gets the next
// number of its type's sequence, else of the default package sequence. The
// rows are read again so a rerun never numbers a package twice.
const numberPackages = async (operation: 'created' | 'updated', events: PackageEvent[]) => {
  const unnamedIds = events.flatMap((event) => {
    const after = eventAfter(event);
    const before = eventBefore(event);

    return after !== undefined && !after.name && (operation === 'created' || Boolean(before?.name)) ? [event.recordId] : [];
  });

  if (unnamedIds.length === 0) {
    return;
  }
  const stored = (
    await stockPackages.find<{ id: string; name: string | null; packageType: { referenceSequenceId: string | null } | null }>(
      { id: { in: unnamedIds } },
      'id name packageType { referenceSequenceId }',
    )
  ).filter((row) => !row.name);
  const sequenceIds = stored.flatMap((row) => row.packageType?.referenceSequenceId ?? []);
  // A deleted type sequence no longer numbers; the default sequence does.
  const liveSequenceIds = new Set(
    (await irSequences.find<{ id: string }>({ id: { in: [...new Set(sequenceIds)] } }, 'id')).map((row) => row.id),
  );
  const errors = errorCollector();

  for (const row of stored) {
    await errors.run(row.id, async () => {
      const sequenceId = row.packageType?.referenceSequenceId ?? null;
      const name =
        sequenceId !== null && liveSequenceIds.has(sequenceId)
          ? await nextNumber(sequenceId)
          : await nextNumberByCode(PACKAGE_SEQUENCE_CODE);

      if (name !== null && name !== '') {
        await stockPackages.update(row.id, { name });
      }
    });
  }
  errors.throwIfAny();
};

// A new, renamed or moved package and every package inside it get their full
// name and path again. A container placed inside one of its own packages is
// put back.
const settleTree = async (operation: 'created' | 'updated', events: PackageEvent[]) => {
  const errors = errorCollector();

  for (const [packageId, { before, last }] of packageChanges(events)) {
    const after = eventAfter(last);

    if (after === undefined) {
      continue;
    }
    const moved = before !== undefined && (before.parentPackageId ?? null) !== (after.parentPackageId ?? null);
    const renamed = before !== undefined && (before.name ?? null) !== (after.name ?? null);

    if (operation !== 'created' && !moved && !renamed) {
      continue;
    }
    await errors.run(packageId, async () => {
      const subtree = await readPackageSubtree(packageId);

      if (subtree === null) {
        return;
      }
      if (!subtree.plan.cycle) {
        await writePackageSubtree(subtree);
        return;
      }
      if (moved && subtree.root.parentPackageId === (after.parentPackageId ?? null)) {
        await putBackForEvent({
          ...OBJECT,
          event: last,
          data: { parentPackageId: before?.parentPackageId ?? null },
          message: PACKAGE_RECURSION_REASON,
        });
        return;
      }
      throw new Error(PACKAGE_RECURSION_REASON);
    });
  }
  errors.throwIfAny();
};

// A transfer weighs the outermost packages its lines go into, so a package's
// type, typed weight or destination container changes the weight of the
// transfers going into its tree, the one it left included.
const reweighTransfers = async (events: PackageEvent[]) => {
  const changed = events.filter((event) => eventChangedFields(event, ['packageTypeId', 'shippingWeight', 'packageDestId']).length > 0);
  const packageIds = [
    ...new Set(changed.flatMap((event) => [event.recordId, eventBefore(event)?.packageDestId ?? null].flatMap((id) => id ?? []))),
  ];

  await recomputePickingState(await pickingsWeighingPackages(packageIds));
};

// The app's own writes come back here: a second pass finds every package
// named, every name, path and location already right, and no staff change.
const handler = async (payload: DatabaseEventBatchPayload<PackageEvent>) => {
  const { operation, events } = readEvents<PackageEventRecord>(payload);
  const errors = errorCollector();

  if (operation === 'created' || operation === 'updated') {
    await errors.run('numbers', () => numberPackages(operation, events));
    await errors.run('names', () => settleTree(operation, events));
    await errors.run('containers', () => packageEdits.placeContainers(operation, events));
  }
  if (operation === 'updated') {
    await errors.run('destinations', () => packageEdits.refuseDestinationLoops(events));
    await errors.run('locations', () => packageEdits.relocatePackages(events));
    await errors.run('weights', () => reweighTransfers(events));
  }
  if (operation === 'deleted') {
    await errors.run('deleted', () => packageEdits.settleDeletedPackages(events));
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_PACKAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-package',
  description:
    "Numbers unnamed packages, keeps the full names, paths and locations of package trees, refuses loops, moves a package's content when a user sets its location, weighs the transfers again when a package's type, weight or destination changes, and puts back a deleted package that stock still names.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPackage.*', batchMode: true },
});
