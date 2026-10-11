import { translate } from 'src/shared/i18n/translate';
import { dayOf } from 'src/stock/orderpoint/utils/day.util';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import {
  productTemplates,
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
} from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_MOVE_REL_ROW, MOVE_ROW, PICKING_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { addTask } from 'src/stock/stock-tasks';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { pickedQuantity } from 'src/stock/utils/plan-backorder-needed.util';
import { planLessQuantityTasks } from 'src/stock/utils/plan-less-quantity-tasks.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveMoveRelRow } from 'src/stock/types/move-move-rel-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

const isOpen = (move: MoveRow) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL;

// Destination links from the given moves, followed to the end of the chain.
const walkDestinations = async (startMoveIds: string[]) => {
  const destinationsByMove = new Map<string, string[]>();
  const moveById = new Map<string, MoveRow>();
  const seen = new Set(startMoveIds);
  let frontier = startMoveIds;

  while (frontier.length > 0) {
    const links = await stockMoveMoveRels.find<MoveMoveRelRow>({ moveOrigId: { in: frontier } }, MOVE_MOVE_REL_ROW);

    for (const link of links) {
      destinationsByMove.set(link.moveOrigId, [...(destinationsByMove.get(link.moveOrigId) ?? []), link.moveDestId]);
    }
    const next = [...new Set(links.map((link) => link.moveDestId))].filter((id) => !seen.has(id));

    next.forEach((id) => seen.add(id));
    if (next.length > 0) {
      (await stockMoves.find<MoveRow>({ id: { in: next } }, MOVE_ROW)).forEach((move) => moveById.set(move.id, move));
    }
    frontier = next;
  }

  return { destinationsByMove, moveById };
};

export const logLessQuantities = async (pickingIds: string[], locale: string | null) => {
  if (pickingIds.length === 0) {
    return;
  }
  const { productUnitDigits: digits } = readStockSettings();
  const moves = (await stockMoves.find<MoveRow>({ pickingId: { in: pickingIds } }, MOVE_ROW)).filter(
    (move) => move.state !== MOVE_STATE.CANCEL,
  );
  const [lines, uoms, products, chains] = await Promise.all([
    stockMoveLines.find<MoveLineRow>({ moveId: { in: moves.map((move) => move.id) } }, MOVE_LINE_ROW),
    readResolvedUoms(),
    readStockProducts([...new Set(moves.map((move) => move.productId))]),
    walkDestinations(moves.map((move) => move.id)),
  ]);
  const reachedPickingIds = [
    ...new Set([
      ...pickingIds,
      ...[...chains.moveById.values()].flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])),
    ]),
  ];
  const pickingNameById = new Map(
    (await stockPickings.find<PickingRow>({ id: { in: reachedPickingIds } }, PICKING_ROW)).map((row) => [row.id, row.name ?? '/']),
  );
  const destinationProducts = await readStockProducts([...new Set([...chains.moveById.values()].map((move) => move.productId))]);
  const templateIds = [...new Set([...destinationProducts.values()].map((product) => product.templateId))];
  const responsibleByTemplate = new Map(
    (await productTemplates.find<{ id: string; responsibleId: string | null }>({ id: { in: templateIds } }, 'id responsibleId')).map(
      (row) => [row.id, row.responsibleId],
    ),
  );
  const downstreamPickingIds = (moveId: string) => {
    const reached = new Set<string>();
    const queue = [...(chains.destinationsByMove.get(moveId) ?? [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const next = queue.shift() as string;
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      const nextMove = chains.moveById.get(next);
      if (nextMove === undefined || !isOpen(nextMove)) {
        continue;
      }
      const pickingId = nextMove.pickingId;
      if (pickingId) {
        reached.add(pickingId);
      }
      queue.push(...(chains.destinationsByMove.get(next) ?? []));
    }
    return reached;
  };

  const tasks = planLessQuantityTasks({
    digits,
    today: dayOf(new Date().toISOString()),
    origins: moves.map((move) => {
      const product = products.get(move.productId);
      const moveUomId = move.productUomId ?? product?.uomId ?? '';
      const moveLines = lines.filter((line) => line.moveId === move.id);

      return {
        pickingName: pickingNameById.get(move.pickingId ?? '') ?? '/',
        productName: product?.displayName ?? '',
        uomName: uoms.get(moveUomId)?.name ?? '',
        demand: move.productUomQty,
        pickedQuantity: pickedQuantity({
          state: move.state,
          productUomQty: move.productUomQty,
          quantity: move.quantity ?? 0,
          picked: move.picked,
          lines: moveLines.map((line) => ({
            picked: line.picked,
            quantityInMoveUnit: convertQuantity({
              qty: line.quantity,
              fromUomId: line.productUomId ?? moveUomId,
              toUomId: moveUomId,
              uoms,
              digits,
              round: false,
            }),
          })),
        }),
        destinations: (chains.destinationsByMove.get(move.id) ?? [])
          .map((id) => chains.moveById.get(id))
          .filter(
            (destination): destination is MoveRow =>
              destination !== undefined && isOpen(destination) && destination.pickingId !== null,
          )
          .map((destination) => ({
            pickingId: destination.pickingId as string,
            responsibleId: responsibleByTemplate.get(destinationProducts.get(destination.productId)?.templateId ?? '') ?? null,
            downstreamPickingNames: [...downstreamPickingIds(destination.id)]
              .filter((pickingId) => pickingId !== destination.pickingId)
              .map((pickingId) => pickingNameById.get(pickingId) ?? '/'),
          })),
      };
    }),
  });

  for (const task of tasks) {
    const body = [
      translate(locale, 'Exception(s) occurred on the transfer {name}. Manual actions may be needed.', {
        name: task.originPickingName,
      }),
      '',
      translate(locale, 'Exception(s):'),
      ...task.exceptions.map(
        (exception) =>
          `- ${translate(locale, '{newQuantity} {unit} of {product} processed instead of {oldQuantity} {unit}', {
            newQuantity: exception.newQuantity,
            oldQuantity: exception.oldQuantity,
            unit: exception.uomName,
            product: exception.productName,
          })}`,
      ),
      ...(task.impactedPickingNames.length > 0
        ? ['', translate(locale, 'Next transfer(s) impacted:'), ...task.impactedPickingNames.map((name) => `- ${name}`)]
        : []),
    ].join('\n');

    await addTask({
      objectSingular: 'stockPicking',
      recordId: task.pickingId,
      title: translate(locale, 'Less quantities than expected on {name}', { name: task.originPickingName }),
      body,
      assigneeId: task.assigneeId,
      dueAt: task.dueAt,
    });
  }
};
