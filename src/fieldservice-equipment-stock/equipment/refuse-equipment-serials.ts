import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_MESSAGES } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-messages.constant';
import { planSerial } from 'src/fieldservice-equipment-stock/utils/plan-serial.util';
import { fsmEquipments } from 'src/fieldservice/fieldservice-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';
import { stockLots } from 'src/stock/lot/lot-records';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;
type EquipmentRow = { id: string; productId: string | null; lotId: string | null; createdAt: string };

const PRODUCT_FIELDS = ['product', 'productId'];
const LOT_FIELDS = ['lot', 'lotId'];

const sideOf = (event: RawEvent, side: 'before' | 'after') =>
  (event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> })[side] ?? null;

const idOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// A staff save that gives equipment a serial of another product, or a serial another live equipment holds, is
// undone with a note: a new equipment loses its serial, a changed one gets its old product and serial back.
// Trashed equipment do not hold a serial. Of two new equipment with one serial, the older keeps it.
export const refuseEquipmentSerials = async (operation: 'created' | 'updated', events: RawEvent[]) => {
  const saves = events.filter(
    (event) =>
      !isApplicationWrite(sideOf(event, 'after') ?? undefined) &&
      (operation === 'created' || updatedFieldsOf(event).some((field) => [...PRODUCT_FIELDS, ...LOT_FIELDS].includes(field))),
  );

  if (saves.length === 0) {
    return;
  }
  const ids = [...new Set(saves.map((event) => event.recordId))];
  const current = await fsmEquipments.find<EquipmentRow>({ id: { in: ids } }, 'id productId lotId createdAt');
  const lotIds = [...new Set(current.flatMap((row) => row.lotId ?? []))];
  const holders = await fsmEquipments.find<EquipmentRow>({ lotId: { in: lotIds } }, 'id productId lotId createdAt');
  const lots = await stockLots.find<{ id: string; productId: string | null }>({ id: { in: lotIds } }, 'id productId');
  const errors = errorCollector();

  for (const row of current) {
    const first = saves.find((event) => event.recordId === row.id);

    if (first === undefined) {
      continue;
    }
    const updated = new Set(saves.filter((event) => event.recordId === row.id).flatMap((event) => updatedFieldsOf(event)));
    const before = sideOf(first, 'before');
    const isCreate = operation === 'created';
    const plan = planSerial({
      productId: row.productId,
      lotId: row.lotId,
      lotProductId: lots.find((lot) => lot.id === row.lotId)?.productId ?? null,
      otherEquipmentWithLot: holders.some(
        (holder) =>
          holder.id !== row.id &&
          holder.lotId === row.lotId &&
          (!isCreate || holder.createdAt < row.createdAt || (holder.createdAt === row.createdAt && holder.id < row.id)),
      ),
      isCreate,
      updatedProduct: PRODUCT_FIELDS.some((field) => updated.has(field)),
      updatedLot: LOT_FIELDS.some((field) => updated.has(field)),
      before: { productId: idOf(before?.productId), lotId: idOf(before?.lotId) },
    });

    if (plan.kind === 'putBack' && Object.keys(plan.data).length > 0) {
      await errors.run(row.id, async () =>
        putBack({
          objectSingular: 'fsmEquipment',
          objectPlural: 'fsmEquipments',
          recordId: row.id,
          data: plan.data,
          reason: await localizedReason(first, FIELDSERVICE_EQUIPMENT_STOCK_MESSAGES[plan.reason]),
        }),
      );
    }
  }
  errors.throwIfAny();
};
