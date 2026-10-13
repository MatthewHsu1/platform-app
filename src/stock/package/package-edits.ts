import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { isStaffChange } from 'src/shared/triggers/actor';
import { stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { addNote } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { stockPackages } from 'src/stock/package/package-records';
import { recomputePackage } from 'src/stock/package/recompute-package';
import { relocatePackage } from 'src/stock/package/relocate-package';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { putBackForEvent, restoreForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines, stockQuants } from 'src/stock/stock-records';
import { PACKAGE_DEST_INSIDE_ITSELF, packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type PackageEventRecord } from 'src/stock/package/types/package-event-record.type';
import { type RelocatePackageOutcome } from 'src/stock/package/types/relocate-package-outcome.type';

type PackageEvent = ObjectRecordEvent<PackageEventRecord>;

type PackageEditsStore = {
  relocatePackage: (packageId: string, toLocationId: string | null) => Promise<RelocatePackageOutcome>;
  putBack: (event: PackageEvent, data: Record<string, unknown>, message: string, values?: TranslationValues) => Promise<void>;
  addNote: (event: PackageEvent, message: string) => Promise<void>;
  recomputePackage: (packageIds: string[]) => Promise<void>;
  // Packages headed into another package.
  readDestinations: () => Promise<{ id: string; packageDestId: string | null }[]>;
  readStoredDestination: (packageId: string) => Promise<string | null | undefined>;
  stillDeletedIds: (packageIds: string[]) => Promise<string[]>;
  // The packages a stock row or a move line names.
  namedIds: (packageIds: string[]) => Promise<Set<string>>;
  restore: (event: PackageEvent, message: string) => Promise<void>;
  readContainedIds: (packageId: string) => Promise<string[]>;
  readHeadedIntoIds: (packageId: string) => Promise<string[]>;
  clearContainer: (packageIds: string[]) => Promise<void>;
  clearDestination: (packageIds: string[]) => Promise<void>;
};

export const makePackageEdits = (store: PackageEditsStore) => {
  // A location a user typed moves the package's content there, keeping it in its packages; the package's location
  // then follows its stock. A refused move puts back the location the package had; while another run moves the
  // package, its location is taken from its stock again, since that run may change it meanwhile.
  const relocatePackages = async (events: PackageEvent[]) => {
    const errors = errorCollector();

    for (const event of events) {
      const before = eventBefore(event);
      const after = eventAfter(event);

      if (
        before === undefined ||
        after === undefined ||
        (before.locationId ?? null) === (after.locationId ?? null) ||
        !isStaffChange('updated', event, after)
      ) {
        continue;
      }
      await errors.run(event.recordId, async () => {
        const outcome = await store.relocatePackage(event.recordId, after.locationId ?? null);

        if (outcome.kind === 'refused') {
          await store.putBack(event, { locationId: before.locationId ?? null }, outcome.reason, outcome.values);
        } else if (outcome.kind === 'held') {
          await store.recomputePackage([event.recordId]);
          await store.addNote(event, CLAIM_HELD_MESSAGE);
        }
      });
    }
    errors.throwIfAny();
  };

  // A package cannot be headed into itself, nor into a package headed into it. The links are read once per batch; a
  // put-back is applied to them, so each package of the batch is judged as if the packages before it had been saved
  // and put back one at a time.
  const refuseDestinationLoops = async (events: PackageEvent[]) => {
    const changed = events.filter((event) => {
      const destinationId = eventAfter(event)?.packageDestId ?? null;
      const before = eventBefore(event);

      return before !== undefined && destinationId !== null && (before.packageDestId ?? null) !== destinationId;
    });

    if (changed.length === 0) {
      return;
    }
    const headed = new Map((await store.readDestinations()).map((row) => [row.id, row.packageDestId]));
    const errors = errorCollector();

    for (const event of changed) {
      const beforeDestinationId = eventBefore(event)?.packageDestId ?? null;
      const destinationId = eventAfter(event)?.packageDestId ?? null;

      await errors.run(event.recordId, async () => {
        const inside = packageDestinationDescendants(
          event.recordId,
          [...headed.entries()].map(([id, packageDestId]) => ({
            id,
            packageDestId: id === event.recordId ? beforeDestinationId : packageDestId,
          })),
        );

        if (destinationId !== null && inside.has(destinationId) && (await store.readStoredDestination(event.recordId)) === destinationId) {
          await store.putBack(event, { packageDestId: beforeDestinationId }, PACKAGE_DEST_INSIDE_ITSELF);
          headed.set(event.recordId, beforeDestinationId);
        }
      });
    }
    errors.throwIfAny();
  };

  // A container gains or loses a package: it is placed again, as are the packages that moved.
  const placeContainers = async (operation: 'created' | 'updated', events: PackageEvent[]) => {
    const ids = events.flatMap((event) => {
      const before = eventBefore(event);
      const after = eventAfter(event);

      if (after === undefined || (operation === 'updated' && (before?.parentPackageId ?? null) === (after.parentPackageId ?? null))) {
        return [];
      }
      return [event.recordId, before?.parentPackageId ?? null, after.parentPackageId ?? null].flatMap((id) => id ?? []);
    });

    if (ids.length > 0) {
      await store.recomputePackage([...new Set(ids)]);
    }
  };

  // A package that stock or a move line names comes back. Any other deleted package lets go of the packages inside
  // it and of the packages headed into it (a delete to the trash clears no link), and its container is placed again.
  const settleDeletedPackages = async (events: PackageEvent[]) => {
    const deletedIds = await store.stillDeletedIds(events.map((event) => event.recordId));

    if (deletedIds.length === 0) {
      return;
    }
    const named = await store.namedIds(deletedIds);
    const deleted = new Set(deletedIds);
    const errors = errorCollector();

    for (const event of events.filter((candidate) => deleted.has(candidate.recordId))) {
      await errors.run(event.recordId, async () => {
        if (named.has(event.recordId)) {
          await store.restore(event, RESTRICT_DELETE_MESSAGE);
          return;
        }
        const [contained, headed] = await Promise.all([
          store.readContainedIds(event.recordId),
          store.readHeadedIntoIds(event.recordId),
        ]);

        await store.clearContainer(contained);
        await store.clearDestination(headed);
        const containerId = eventBefore(event)?.parentPackageId ?? null;

        if (containerId !== null) {
          await store.recomputePackage([containerId]);
        }
      });
    }
    errors.throwIfAny();
  };

  return { relocatePackages, refuseDestinationLoops, placeContainers, settleDeletedPackages };
};

const OBJECT = { objectSingular: 'stockPackage', objectPlural: 'stockPackages' } as const;

export const packageEdits = makePackageEdits({
  relocatePackage,
  putBack: (event, data, message, values) => putBackForEvent({ ...OBJECT, event, data, message, values }),
  addNote: async (event, message) =>
    addNote({ objectSingular: OBJECT.objectSingular, recordId: event.recordId, title: 'Change undone', body: await localizedReason(event, message) }),
  recomputePackage,
  readDestinations: () =>
    stockPackages.find<{ id: string; packageDestId: string | null }>({ packageDestId: { is: 'NOT_NULL' } }, 'id packageDestId'),
  readStoredDestination: async (packageId) =>
    (await stockPackages.find<{ packageDestId: string | null }>({ id: { eq: packageId } }, 'packageDestId'))[0]?.packageDestId,
  stillDeletedIds: (packageIds) => stillDeletedIds(stockPackages, packageIds),
  namedIds: async (packageIds) => {
    const [quants, lines] = await Promise.all([
      stockQuants.find<{ packageId: string | null }>({ packageId: { in: packageIds } }, 'packageId'),
      stockMoveLines.find<{ packageId: string | null; resultPackageId: string | null }>(
        { or: [{ packageId: { in: packageIds } }, { resultPackageId: { in: packageIds } }] },
        'packageId resultPackageId',
      ),
    ]);

    return new Set([
      ...quants.flatMap((row) => row.packageId ?? []),
      ...lines.flatMap((row) => [row.packageId, row.resultPackageId].flatMap((id) => id ?? [])),
    ]);
  },
  restore: (event, message) => restoreForEvent({ ...OBJECT, event, message }),
  readContainedIds: async (packageId) =>
    (await stockPackages.find<{ id: string }>({ parentPackageId: { eq: packageId } }, 'id')).map((row) => row.id),
  readHeadedIntoIds: async (packageId) =>
    (await stockPackages.find<{ id: string }>({ packageDestId: { eq: packageId } }, 'id')).map((row) => row.id),
  clearContainer: (packageIds) => stockPackages.updateMany(packageIds, { parentPackageId: null }),
  clearDestination: (packageIds) => stockPackages.updateMany(packageIds, { packageDestId: null }),
});
