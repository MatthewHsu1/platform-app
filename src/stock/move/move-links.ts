import { stockMoveMoveRels, stockMoves, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_MOVE_REL_ROW } from 'src/stock/stock-rows';
import { type MoveLinks } from 'src/stock/move/types/move-links.type';
import { type MoveMoveRelRow } from 'src/stock/types/move-move-rel-row.type';

type MovePair = { moveOrigId: string; moveDestId: string };

const distinct = (ids: string[]) => [...new Set(ids)];

const append = (map: Map<string, string[]>, key: string, value: string) => {
  const values = map.get(key) ?? [];
  if (!values.includes(value)) {
    map.set(key, [...values, value]);
  }
};

export const readMoveLinks = async (moveIds: string[]): Promise<MoveLinks> => {
  const links: MoveLinks = { origsOf: new Map(), destsOf: new Map() };
  const ids = distinct(moveIds);

  if (ids.length === 0) {
    return links;
  }

  const rows = [
    ...(await stockMoveMoveRels.find<MoveMoveRelRow>({ moveDestId: { in: ids } }, MOVE_MOVE_REL_ROW)),
    ...(await stockMoveMoveRels.find<MoveMoveRelRow>({ moveOrigId: { in: ids } }, MOVE_MOVE_REL_ROW)),
  ];

  for (const row of rows) {
    append(links.origsOf, row.moveDestId, row.moveOrigId);
    append(links.destsOf, row.moveOrigId, row.moveDestId);
  }

  return links;
};

export const readMoveReferences = async (moveIds: string[]) => {
  const references = new Map<string, string[]>();
  const ids = distinct(moveIds);

  if (ids.length === 0) {
    return references;
  }

  const rows = await stockReferenceMoveRels.find<{ referenceId: string; moveId: string }>(
    { moveId: { in: ids } },
    'referenceId moveId',
  );
  for (const row of rows) {
    append(references, row.moveId, row.referenceId);
  }

  return references;
};

// The transfers the original moves of each move belong to.
export const readOriginPickingIds = async (moveIds: string[], links: MoveLinks) => {
  const origIds = distinct(moveIds.flatMap((id) => links.origsOf.get(id) ?? []));
  const rows =
    origIds.length === 0
      ? []
      : await stockMoves.find<{ id: string; pickingId: string | null }>({ id: { in: origIds } }, 'id pickingId');
  const pickingOf = new Map(rows.map((row) => [row.id, row.pickingId]));

  return new Map(
    moveIds.map((id) => [
      id,
      distinct((links.origsOf.get(id) ?? []).flatMap((origId) => {
        const pickingId = pickingOf.get(origId);
        return pickingId ? [pickingId] : [];
      })),
    ]),
  );
};

export const linkMoves = async (pairs: MovePair[]) => {
  if (pairs.length === 0) {
    return;
  }

  const existing = await readMoveLinks(distinct(pairs.map((pair) => pair.moveOrigId)));
  const seen = new Set<string>();
  const missing = pairs.filter((pair) => {
    const key = `${pair.moveOrigId}|${pair.moveDestId}`;
    const isNew = !seen.has(key) && !(existing.destsOf.get(pair.moveOrigId) ?? []).includes(pair.moveDestId);
    seen.add(key);
    return isNew;
  });

  await stockMoveMoveRels.createMany(missing);
};

// A removed link loses its row for good; the unique pair index would refuse it again otherwise.
export const unlinkMoves = async (pairs: MovePair[]) => {
  if (pairs.length === 0) {
    return;
  }

  const wanted = new Set(pairs.map((pair) => `${pair.moveOrigId}|${pair.moveDestId}`));
  const rows = await stockMoveMoveRels.find<MoveMoveRelRow>(
    { moveOrigId: { in: distinct(pairs.map((pair) => pair.moveOrigId)) } },
    MOVE_MOVE_REL_ROW,
  );

  await stockMoveMoveRels.destroyMany(
    rows.filter((row) => wanted.has(`${row.moveOrigId}|${row.moveDestId}`)).map((row) => row.id),
  );
};
