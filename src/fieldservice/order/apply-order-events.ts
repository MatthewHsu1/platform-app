import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { nextNumberByCode } from 'src/base/sequence/next-number';
import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { NO_ORDER_NUMBER, ORDER_SEQUENCE_CODE, ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';
import { fsmEquipmentFsmOrderRels, fsmEquipments, fsmLocations, fsmOrders, fsmTeams, fsmTemplates } from 'src/fieldservice/fieldservice-records';
import { ORDER_SELECTION, readOrderState, toOrderInput } from 'src/fieldservice/order/order-state';
import { readFieldserviceSettings } from 'src/fieldservice/read-fieldservice-settings';
import { type OrderSaveContext } from 'src/fieldservice/types/order-save-context.type';
import { type OrderState } from 'src/fieldservice/types/order-state.type';
import { planDeleteGuard } from 'src/fieldservice/utils/plan-delete-guard.util';
import { planOrderSave } from 'src/fieldservice/utils/plan-order-save.util';
import { resourceCalendarLeaves } from 'src/resource/resource-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { addNote, restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { findMany } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

type LocationNode = OrderSaveContext['location'] & { id: string };

const sideOf = (event: RawEvent, side: 'before' | 'after') => {
  const properties = event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> };

  return properties[side] ?? null;
};

const markdownOf = (value: { markdown: string | null } | null) => (value?.markdown === '' ? null : (value?.markdown ?? null));

// Everything one batch of order saves reads besides the orders: their locations and templates, the teams in
// sequence order, every time off and the settings.
const loadContexts = async (orders: OrderState[], now: string) => {
  const found = await findMany<{
    locations: LocationNode[];
    teams: { id: string; sequence: number | null; createdAt: string }[];
    templates: { id: string; instructions: { markdown: string | null } | null }[];
    holidays: { name: string | null; dateFrom: string | null; dateTo: string | null }[];
  }>({
    locations: {
      of: fsmLocations,
      filter: { id: { in: orders.flatMap((order) => order.locationId ?? []) } },
      selection: 'id teamId completeDirection territoryId branchId districtId regionId',
    },
    teams: { of: fsmTeams, filter: { active: { eq: true } }, selection: 'id sequence createdAt' },
    templates: { of: fsmTemplates, filter: { id: { in: orders.flatMap((order) => order.templateId ?? []) } }, selection: 'id instructions { markdown }' },
    holidays: { of: resourceCalendarLeaves, filter: {}, selection: 'name dateFrom dateTo' },
  });
  const settings = await readFieldserviceSettings();
  const teamsBySequence = [...found.teams].sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt),
  );
  const locations = new Map(found.locations.map((location) => [location.id, location]));
  const instructions = new Map(found.templates.map((template) => [template.id, markdownOf(template.instructions)]));

  return (order: OrderState): OrderSaveContext => ({
    now,
    location: order.locationId === null ? null : (locations.get(order.locationId) ?? null),
    teamsBySequence,
    templateInstructions: order.templateId === null ? null : (instructions.get(order.templateId) ?? null),
    holidays: found.holidays,
    hoursByPriority: settings.hoursByPriority,
  });
};

// A new order at a location gets the equipment that is now at that location, when the setting says so.
const fillEquipment = async (orders: OrderState[]) => {
  const settings = await readFieldserviceSettings();
  const located = orders.filter((order) => order.locationId !== null);

  if (!settings.autoPopulateEquipmentsOnOrder || located.length === 0) {
    return;
  }
  const found = await findMany<{
    links: { orderId: string }[];
    equipment: { id: string; currentLocationId: string | null }[];
  }>({
    links: { of: fsmEquipmentFsmOrderRels, filter: { orderId: { in: located.map((order) => order.id) } }, selection: 'orderId' },
    equipment: {
      of: fsmEquipments,
      filter: { currentLocationId: { in: located.map((order) => order.locationId) } },
      selection: 'id currentLocationId',
    },
  });
  const linked = new Set(found.links.map((link) => link.orderId));
  const rows = located
    .filter((order) => !linked.has(order.id))
    .flatMap((order) =>
      found.equipment.filter((row) => row.currentLocationId === order.locationId).map((row) => ({ orderId: order.id, equipmentId: row.id })),
    );

  if (rows.length > 0) {
    await fsmEquipmentFsmOrderRels.createMany(rows);
  }
};

export type OrderEventsResult = { teamsToCount: (string | null)[]; warnings: string[] };

// Plans each saved order on its stored row and writes only what differs. A refused create is removed (no record
// is left to hold a note, so the reason goes to the log); a refused update gets its written values back with a
// note. The number is taken last, so a refused order uses none.
export const applyOrderSaves = async (operation: 'created' | 'updated', events: RawEvent[], now: string): Promise<OrderEventsResult> => {
  const ids = [...new Set(events.map((event) => event.recordId))];
  const fresh = (await fsmOrders.find<Record<string, unknown>>({ id: { in: ids } }, ORDER_SELECTION)).map(readOrderState);
  const contextOf = await loadContexts(fresh, now);
  const errors = errorCollector();
  const result: OrderEventsResult = { teamsToCount: [], warnings: [] };
  const created: OrderState[] = [];

  for (const current of fresh) {
    const saves = events.filter((event) => event.recordId === current.id);
    const firstBefore = sideOf(saves[0], 'before');
    const before = operation === 'created' ? null : firstBefore === null ? current : readOrderState(firstBefore);
    const written = new Set(saves.flatMap((event) => updatedFieldsOf(event)));
    const staffSave = saves.some((event) => !isApplicationWrite(sideOf(event, 'after') ?? undefined));

    await errors.run(current.id, async () => {
      const plan = planOrderSave({ before, after: current, written, staffSave, context: contextOf(current) });

      result.teamsToCount.push(before?.teamId ?? null, current.teamId);
      if (plan.kind === 'refuse') {
        const reason = await localizedReason(saves[saves.length - 1], plan.reason, plan.values);

        if (before === null) {
          await fsmOrders.destroyMany([current.id]);
          result.warnings.push(`Service order ${current.id} was removed: ${reason}`);
          return;
        }
        await fsmOrders.update(current.id, toOrderInput(plan.putBack));
        await addNote({ objectSingular: 'fsmOrder', recordId: current.id, title: 'Change undone', body: reason });
        return;
      }
      const data: Partial<OrderState> = { ...plan.data };

      if (before === null && (current.name === null || current.name === NO_ORDER_NUMBER)) {
        const number = await nextNumberByCode(ORDER_SEQUENCE_CODE);

        if (number !== null) {
          data.name = number;
        }
      }
      await fsmOrders.update(current.id, toOrderInput(data));
      result.teamsToCount.push(data.teamId ?? null);
      if (before === null) {
        created.push({ ...current, ...data });
      }
    });
  }
  await errors.run('equipment', () => fillEquipment(created));
  errors.throwIfAny();

  return result;
};

// An order may only be deleted while it sits in the New stage: any other comes back with a note.
export const refuseOrderDeletes = async (events: RawEvent[]) => {
  const errors = errorCollector();
  const allowed: string[] = [];

  for (const event of events) {
    const before = sideOf(event, 'before');
    const stage = before === null ? null : readOrderState(before).stage;

    await errors.run(event.recordId, async () => {
      if (planDeleteGuard(stage === ORDER_STAGE.NEW).allow) {
        allowed.push(event.recordId);
        return;
      }
      await restoreIfStillDeleted({
        objectSingular: 'fsmOrder',
        objectPlural: 'fsmOrders',
        recordId: event.recordId,
        reason: await localizedReason(event, FIELDSERVICE_MESSAGES.deleteOnlyNew),
      });
    });
  }
  errors.throwIfAny();

  return allowed;
};
