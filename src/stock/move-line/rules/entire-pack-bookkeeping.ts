import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { readEntirePackLines } from 'src/stock/package/check-entire-pack';
import { readHeadedPackages, readOpenLinesInto } from 'src/stock/package/pack-into';
import { stockPackages } from 'src/stock/package/package-records';
import { readPackageContents } from 'src/stock/package/read-package-content';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { stockMoveLines } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { destinationChains, packagesWithoutOpenLines, planEntirePackBreaks } from 'src/stock/utils/plan-entire-pack.util';

// The line values that decide whether a line still moves its package whole.
const WATCHED_FIELDS: (keyof MoveLineEventRecord & string)[] = [
  'pickingId',
  'productId',
  'productUomId',
  'quantity',
  'quantityProductUom',
  'lotId',
  'packageId',
  'resultPackageId',
  'locationId',
  'locationDestId',
  'ownerId',
];

const presentRows = (event: ObjectRecordEvent<MoveLineEventRecord>) =>
  [eventBefore(event), eventAfter(event)].flatMap((row) => (row === undefined ? [] : [row]));

const clearBrokenEntirePacks = async (pickingIds: string[]) => {
  const marked = await stockMoveLines.find<{ id: string }>({ pickingId: { in: pickingIds }, isEntirePack: { eq: true } }, 'id');

  if (marked.length === 0) {
    return;
  }
  const lines = await readEntirePackLines(pickingIds);
  const entire = lines.filter((line) => line.isEntirePack);

  if (entire.length === 0) {
    return;
  }
  const toClear = planEntirePackBreaks({
    lines,
    packages: await readPackageContents(entire.flatMap((line) => line.packageId ?? [])),
    digits: readStockSettings().productUnitDigits,
  });

  await stockMoveLines.updateMany(toClear, { isEntirePack: false });
};

// Containers that the lines' old destination packages were headed into stop
// being headed anywhere once no open line of a transfer goes into them.
const freeIdleContainers = async (oldResultPackageIds: string[]) => {
  if (oldResultPackageIds.length === 0) {
    return;
  }
  const headed = await readHeadedPackages();
  const headedIds = new Set(headed.map((pack) => pack.id));
  const candidates = [...destinationChains(oldResultPackageIds, headed)].filter((packageId) => headedIds.has(packageId));

  if (candidates.length === 0) {
    return;
  }
  const openLines = await readOpenLinesInto<{ id: string; resultPackageId: string; pickingId: string | null }>(
    candidates,
    headed,
    'id resultPackageId pickingId',
  );

  await stockPackages.updateMany(
    packagesWithoutOpenLines({
      candidateIds: candidates,
      packages: headed,
      openLineResultPackageIds: new Set(openLines.flatMap((line) => (line.pickingId === null ? [] : [line.resultPackageId]))),
    }),
    { packageDestId: null },
  );
};

// Any line change, the app's own included, can break a package moved whole:
// the transfer's lines no longer marked as such lose the mark. A line that
// leaves its destination package, or goes, frees the containers above it
// that no open line reaches any more. Both writes leave the watched fields
// alone, so a second pass finds nothing to do.
export const handleEntirePackBookkeeping = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created' && operation !== 'updated' && operation !== 'deleted' && operation !== 'destroyed') {
    return;
  }
  const touched = operation === 'updated' ? events.filter((event) => eventChangedFields(event, WATCHED_FIELDS).length > 0) : events;

  if (touched.length === 0) {
    return;
  }
  const pickingIds = [...new Set(touched.flatMap(presentRows).flatMap((row) => row.pickingId ?? []))];
  const leftPackageIds =
    operation === 'created'
      ? []
      : [
          ...new Set(
            touched
              .filter((event) => operation !== 'updated' || eventChangedFields(event, ['resultPackageId']).length > 0)
              .flatMap((event) => (eventBefore(event) ?? eventAfter(event))?.resultPackageId ?? []),
          ),
        ];

  if (pickingIds.length > 0) {
    await errors.run('entire packages', () => clearBrokenEntirePacks(pickingIds));
  }
  await errors.run('destination containers', () => freeIdleContainers(leftPackageIds));
};
