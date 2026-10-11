import { readMoveLinks } from 'src/stock/move/move-links';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { planOriginAvailability } from 'src/stock/utils/plan-reserve.util';
import { type MoveLinks } from 'src/stock/move/types/move-links.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type OriginAvailability } from 'src/stock/utils/types/origin-availability.type';

const RESERVED_STATES = [MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.ASSIGNED];

const distinct = (ids: string[]) => [...new Set(ids)];

const quantityOf = (line: MoveLineRow) => line.quantityProductUom ?? line.quantity;

// What the done original lines brought into each chained move's source, per location, lot and owner,
// less what sibling moves took and what the move already holds.
export const readOriginAvailability = async (moves: MoveRow[], links: MoveLinks, digits: number) => {
  const result = new Map<string, { poolKey: string; available: OriginAvailability[] }>();
  const chained = moves.filter((move) => (links.origsOf.get(move.id) ?? []).length > 0);

  if (chained.length === 0) {
    return result;
  }

  const origIds = distinct(chained.flatMap((move) => links.origsOf.get(move.id) ?? []));
  const origLinks = await readMoveLinks(origIds);
  const destIds = distinct(origIds.flatMap((id) => origLinks.destsOf.get(id) ?? []));
  const destLinks = await readMoveLinks(destIds);
  const inIds = distinct(destIds.flatMap((id) => destLinks.origsOf.get(id) ?? []));
  const related = await stockMoves.find<{ id: string; state: string }>(
    { id: { in: distinct([...inIds, ...destIds]) } },
    'id state',
  );
  const stateOf = new Map(related.map((move) => [move.id, move.state]));
  const lines = await stockMoveLines.find<MoveLineRow>(
    { moveId: { in: distinct([...inIds, ...destIds, ...chained.map((move) => move.id)]) } },
    MOVE_LINE_ROW,
  );
  const linesOf = (moveIds: string[]) => lines.filter((line) => line.moveId !== null && moveIds.includes(line.moveId));

  for (const move of chained) {
    const origs = links.origsOf.get(move.id) ?? [];
    const dests = distinct(origs.flatMap((id) => origLinks.destsOf.get(id) ?? []));
    const ins = distinct(dests.flatMap((id) => destLinks.origsOf.get(id) ?? [])).filter(
      (id) => stateOf.get(id) === MOVE_STATE.DONE,
    );
    const siblings = dests.filter((id) => id !== move.id);

    result.set(move.id, {
      poolKey: [...origs].sort().join(','),
      available: planOriginAvailability({
        linesIn: linesOf(ins)
          .filter((line) => line.productId === move.productId)
          .map((line) => ({
            locationDestId: line.locationDestId,
            lotId: line.lotId,
            resultPackageId: line.resultPackageId,
            ownerId: line.ownerId,
            quantityProductUom: quantityOf(line),
          })),
        siblingDoneLines: linesOf(siblings.filter((id) => stateOf.get(id) === MOVE_STATE.DONE)).map((line) => ({
          locationId: line.locationId,
          lotId: line.lotId,
          packageId: line.packageId,
          ownerId: line.ownerId,
          quantityProductUom: quantityOf(line),
        })),
        siblingReservedLines: linesOf(
          siblings.filter((id) => RESERVED_STATES.includes(stateOf.get(id) as (typeof RESERVED_STATES)[number])),
        ).map((line) => ({
          locationId: line.locationId,
          lotId: line.lotId,
          packageId: line.packageId,
          ownerId: line.ownerId,
          quantityProductUom: quantityOf(line),
        })),
        ownLines: linesOf([move.id]).map((line) => ({
          locationId: line.locationId,
          lotId: line.lotId,
          packageId: line.packageId,
          ownerId: line.ownerId,
          quantityProductUom: quantityOf(line),
        })),
        digits,
      }),
    });
  }

  return result;
};
