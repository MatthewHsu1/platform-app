import { type LotMoveGroup } from 'src/stock/utils/types/lot-move-group.type';

// Lots go into runs in the order they were edited, as many as add up to `maxQuants` stock rows; a lot without stock
// still takes a claim, so it counts as one, and a lot with more rows than that runs alone. A lot edited twice in one
// save starts a later run, so its edits apply one after the other.
export const planLotRelocationRuns = <TEdit extends { lotId: string }>({
  edits,
  quantCounts,
  maxQuants,
}: {
  edits: TEdit[];
  quantCounts: Map<string, number>;
  maxQuants: number;
}): TEdit[][] => {
  const runs: TEdit[][] = [];
  let run: TEdit[] = [];
  let size = 0;

  for (const entry of edits) {
    const weight = Math.max(1, quantCounts.get(entry.lotId) ?? 0);

    if (run.length > 0 && (size + weight > maxQuants || run.some((planned) => planned.lotId === entry.lotId))) {
      runs.push(run);
      run = [];
      size = 0;
    }
    run.push(entry);
    size += weight;
  }
  if (run.length > 0) {
    runs.push(run);
  }
  return runs;
};

// One move of many rows per destination. Whether rows leave their package is decided for a whole move, so a lot
// that leaves its package moves apart from one that keeps it.
export const groupLotMoves = (
  lots: { lotId: string; quantIds: string[]; unpack: boolean; toLocationId: string | null }[],
): LotMoveGroup[] => {
  const groups = new Map<string, LotMoveGroup>();

  for (const lot of lots) {
    const key = JSON.stringify([lot.toLocationId, lot.unpack]);
    const group = groups.get(key) ?? { toLocationId: lot.toLocationId, unpack: lot.unpack, quantIds: [] };

    group.quantIds.push(...lot.quantIds);
    groups.set(key, group);
  }
  return [...groups.values()];
};
