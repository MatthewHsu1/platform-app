import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { type MoveState } from 'src/stock/types/move-state.type';
import { openLinePackageIds } from 'src/stock/utils/status-targets.util';

// The transfers the clicking user can read that return this one.
export const readReturnIds = async (pickingId: string) =>
  (
    await findReadableAsPerson<{ id: string }>('stockPickings', 'StockPickingFilterInput', { returnPickingId: { eq: pickingId } }, 'id')
  ).map((row) => row.id);

// The packages the open lines of a transfer put things in, with every package
// those go into, up to the top. Only the links are read here: callers keep
// the rows the clicking user can read.
export const readOpenLinePackageChain = async (pickingId: string) => {
  const lines = await findReadableAsPerson<{ state: MoveState; resultPackageId: string | null }>(
    'stockMoveLines',
    'StockMoveLineFilterInput',
    { pickingId: { eq: pickingId } },
    'state resultPackageId',
  );

  return walkPackageTree<{ id: string; packageDestId: string | null }>({
    startIds: openLinePackageIds(lines),
    up: ['packageDestId'],
    down: [],
    selection: 'id packageDestId',
  });
};
