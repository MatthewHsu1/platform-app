import { fsmEquipmentFsmOrderRels, fsmEquipments, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { planDescription } from 'src/fieldservice/utils/plan-description.util';
import { findMany } from 'src/shared/triggers/records';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

type MarkdownValue = { markdown: string | null } | null;

// Orders without a description take the notes of their equipment.
export const fillOrderDescriptions = async (orderIds: string[]) => {
  const ids = [...new Set(orderIds)];

  if (ids.length === 0) {
    return;
  }
  const found = await findMany<{
    orders: { id: string; description: MarkdownValue }[];
    links: { orderId: string; equipmentId: string }[];
  }>({
    orders: { of: fsmOrders, filter: { id: { in: ids } }, selection: 'id description { markdown }' },
    links: { of: fsmEquipmentFsmOrderRels, filter: { orderId: { in: ids } }, selection: 'orderId equipmentId' },
  });
  const equipment = await fsmEquipments.find<{ id: string; notes: MarkdownValue }>(
    { id: { in: [...new Set(found.links.map((link) => link.equipmentId))] } },
    'id notes { markdown }',
  );
  const notesById = new Map(equipment.map((row) => [row.id, textOrNull(row.notes?.markdown ?? null)]));

  for (const order of found.orders) {
    const description = planDescription(
      textOrNull(order.description?.markdown ?? null),
      found.links.filter((link) => link.orderId === order.id).map((link) => notesById.get(link.equipmentId) ?? null),
    );

    if (description !== null) {
      await fsmOrders.update(order.id, { description: { markdown: description } });
    }
  }
};
