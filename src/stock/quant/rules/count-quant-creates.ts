import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { type ErrorCollector, retryOnConflict } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { stockLots } from 'src/stock/lot/lot-records';
import { stockPackages } from 'src/stock/package/package-records';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { quantKey } from 'src/stock/quant/quant-key';
import { type QuantEventRecord } from 'src/stock/quant/types/quant-event-record.type';
import { ACTOR_SELECTION, creatorMemberId, eventAfter, localizedReason } from 'src/stock/stock-event-helpers';
import { companies, stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { nextCountDate } from 'src/stock/utils/next-count-date.util';
import { planCountQuantCreate } from 'src/stock/utils/plan-count-quant-create.util';
import { quantName } from 'src/stock/utils/quant-name.util';

// The new row has no key yet (users cannot write it), so the unique index lets it in;
// writing the key can then clash with a row another run made a moment ago, so the whole step runs again on that clash,
// finds the other row and merges. A refused row is destroyed (it never existed) and the note goes on the location.
export const handleCountQuantCreates = async (
  events: ObjectRecordEvent<QuantEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }
  const staffEvents = events.filter((event) => !isApplicationWrite(eventAfter(event)));

  if (staffEvents.length === 0) {
    return;
  }

  const rows = await stockQuants.find<QuantEventRecord>(
    { id: { in: staffEvents.map((event) => event.recordId) } },
    `${QUANT_ROW} ${ACTOR_SELECTION}`,
  );
  const products = await readStockProducts(rows.map((row) => row.productId));
  const locations = await readLocations(rows.map((row) => row.locationId));
  const ownerIds = [...new Set(rows.flatMap((row) => (row.ownerId === null ? [] : [row.ownerId])))];
  const owners = new Map(
    ownerIds.length === 0
      ? []
      : (await companies.find<{ id: string; name: string | null }>({ id: { in: ownerIds } }, 'id name')).map((owner) => [
          owner.id,
          owner.name,
        ]),
  );
  const lotIds = [...new Set(rows.flatMap((row) => (row.lotId === null ? [] : [row.lotId])))];
  const lotNames = new Map(
    lotIds.length === 0
      ? []
      : (await stockLots.find<{ id: string; name: string | null }>({ id: { in: lotIds } }, 'id name')).map((lot) => [
          lot.id,
          lot.name,
        ]),
  );
  const packageIds = [...new Set(rows.flatMap((row) => (row.packageId === null ? [] : [row.packageId])))];
  const packageNames = new Map(
    (await stockPackages.find<{ id: string; name: string | null; completeName: string | null }>(
      { id: { in: packageIds } },
      'id name completeName',
    )).map((pack) => [pack.id, pack.completeName ?? pack.name]),
  );
  const settings = readStockSettings();
  const today = todayUtc();

  for (const event of staffEvents) {
    const row = rows.find((candidate) => candidate.id === event.recordId);
    const location = row === undefined ? undefined : locations.get(row.locationId);

    if (row === undefined || location === undefined) {
      continue;
    }
    await errors.run(row.id, () =>
      retryOnConflict(async () => {
        const product = products.get(row.productId);
        const key = quantKey({
          productId: row.productId,
          locationId: row.locationId,
          lotId: row.lotId,
          packageId: row.packageId,
          ownerId: row.ownerId,
        });
        // A stock row in the trash still holds the key: it comes back and takes the count.
        const [existing] = await stockQuants.findIncludingDeleted<{ id: string; quantity: number; deletedAt: string | null }>(
          { quantKey: { eq: key }, id: { neq: row.id } },
          'id quantity deletedAt',
        );
        const locationName = location.completeName ?? location.name ?? '';
        const plan = planCountQuantCreate({
          created: row,
          existing: existing ?? null,
          isStorable: product?.isStorable ?? false,
          location: { usage: location.usage, completeName: location.completeName ?? location.name },
          name: quantName({
            productName: product?.displayName ?? '',
            locationName,
            lotName: row.lotId === null ? null : (lotNames.get(row.lotId) ?? null),
            packageName: row.packageId === null ? null : (packageNames.get(row.packageId) ?? null),
            ownerName: row.ownerId === null ? null : (owners.get(row.ownerId) ?? null),
          }),
          creatorMemberId: creatorMemberId(event, row),
          today,
          nextCountDate: nextCountDate({
            usage: location.usage,
            nextInventoryDate: location.nextInventoryDate,
            today,
            annualInventoryMonth: settings.annualInventoryMonth,
            annualInventoryDay: settings.annualInventoryDay,
          }),
          now: nowIso(),
          digits: settings.productUnitDigits,
        });

        if (plan.kind === 'refuse') {
          await stockQuants.destroyMany([row.id]);
          await addNote({
            objectSingular: 'stockLocation',
            recordId: row.locationId,
            title: 'Stock row not kept',
            body: await localizedReason(event, plan.reason, plan.values),
          });
          return;
        }
        if (plan.kind === 'merge') {
          if (existing !== undefined && existing.deletedAt !== null) {
            await stockQuants.restore(plan.targetId);
          }
          await stockQuants.update(plan.targetId, plan.data);
          await stockQuants.destroyMany([plan.destroyId]);
          return;
        }
        await stockQuants.update(row.id, plan.data);
      }),
    );
  }
};
