import { planEquipmentForMove, planEquipmentName } from 'src/fieldservice-equipment-stock/utils/plan-equipment-for-move.util';
import { fsmEquipments, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockLots } from 'src/stock/lot/lot-records';
import { productProducts } from 'src/product/variant/product-records';
import { stockMoveLines, stockMoves, stockPickingTypes } from 'src/stock/stock-records';

type MoveRow = { id: string; productId: string | null; pickingTypeId: string | null; fsmOrderId: string | null };
type ProductRow = { id: string; name: string | null; productTmpl: { createFsmEquipment: boolean | null } | null };
type LineRow = { moveId: string; lotId: string | null; quantity: number };

// A move that is done makes the equipment of the serials it moved (see planEquipmentForMove). Each serial is read
// again for equipment just before it is made, so a second pass over the same move makes nothing.
export const createEquipmentForMoves = async (moveIds: string[]) => {
  const moves = await stockMoves.find<MoveRow>({ id: { in: moveIds }, state: { eq: MOVE_STATE.DONE } }, 'id productId pickingTypeId fsmOrderId');
  const pickingTypes = await stockPickingTypes.find<{ id: string }>(
    { id: { in: [...new Set(moves.flatMap((move) => move.pickingTypeId ?? []))] }, createFsmEquipment: { eq: true } },
    'id',
  );
  const pickingTypeCreates = new Set(pickingTypes.map((pickingType) => pickingType.id));

  if (pickingTypeCreates.size === 0) {
    return;
  }
  const products = await productProducts.find<ProductRow>(
    { id: { in: [...new Set(moves.flatMap((move) => move.productId ?? []))] } },
    'id name productTmpl { createFsmEquipment }',
  );
  const lines = await stockMoveLines.find<LineRow>(
    { moveId: { in: moves.map((move) => move.id) }, state: { eq: MOVE_STATE.DONE }, lotId: { is: 'NOT_NULL' } },
    'moveId lotId quantity',
  );
  const lots = await stockLots.find<{ id: string; name: string | null }>(
    { id: { in: [...new Set(lines.flatMap((line) => line.lotId ?? []))] } },
    'id name',
  );
  const orders = await fsmOrders.find<{ id: string; locationId: string | null }>(
    { id: { in: [...new Set(moves.flatMap((move) => move.fsmOrderId ?? []))] } },
    'id locationId',
  );
  const serialsWithEquipment = new Set(
    (await fsmEquipments.find<{ lotId: string | null }>({ lotId: { in: lots.map((lot) => lot.id) } }, 'lotId')).flatMap((equipment) => equipment.lotId ?? []),
  );
  const rows: Record<string, unknown>[] = [];

  for (const move of moves) {
    const product = products.find((candidate) => candidate.id === move.productId);
    const order = orders.find((candidate) => candidate.id === move.fsmOrderId);
    const planned = planEquipmentForMove({
      productCreates: product?.productTmpl?.createFsmEquipment === true,
      pickingTypeCreates: move.pickingTypeId !== null && pickingTypeCreates.has(move.pickingTypeId),
      lines: lines.filter((line) => line.moveId === move.id),
      serialsWithEquipment,
      orderLocationId: order?.locationId ?? null,
    });

    for (const equipment of planned) {
      serialsWithEquipment.add(equipment.lotId);
      rows.push({
        name: planEquipmentName(product?.name ?? '', lots.find((lot) => lot.id === equipment.lotId)?.name ?? ''),
        productId: move.productId,
        lotId: equipment.lotId,
        locationId: equipment.locationId,
        currentLocationId: equipment.locationId,
      });
    }
  }
  if (rows.length > 0) {
    await fsmEquipments.createMany(rows);
  }
};
