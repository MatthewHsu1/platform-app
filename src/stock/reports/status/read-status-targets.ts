import { readOpenLinePackageChain, readReturnIds } from 'src/stock/picking/read-picking-related';
import { STATUS_TARGETS_MESSAGES } from 'src/stock/reports/status/status-targets-messages.constant';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { todayUtc } from 'src/stock/stock-settings';
import { type PickingState } from 'src/stock/types/picking-state.type';
import {
  inInternalWarehouseLocation,
  isNotSnoozed,
  mainPackageIds,
  nextTransferIds,
  statusTarget,
} from 'src/stock/utils/status-targets.util';
import { type StatusButton } from 'src/stock/utils/types/status-button.type';
import { type StatusTargetsAnswer } from 'src/stock/utils/types/status-targets-answer.type';

type Source = 'picking' | 'variant';
type Found = { objectNameSingular: string; ids: string[] };
type Target = { source: Source; find: (recordId: string, sourceState: PickingState | null) => Promise<Found> };

const idsOf = (rows: { id: string }[]) => rows.map((row) => row.id);

const readIdsAsPerson = async (objectPlural: string, filterType: string, filter: Record<string, unknown>) =>
  idsOf(await findReadableAsPerson<{ id: string }>(objectPlural, filterType, filter, 'id'));

const found = (objectNameSingular: string) => (ids: string[]): Found => ({ objectNameSingular, ids });

// A done transfer shows the package records it left behind; an open one shows
// the packages its lines fill, with every package those go into. Either list
// keeps only the outermost ones.
const pickingPackages = async (pickingId: string, pickingState: PickingState | null): Promise<Found> => {
  if (pickingState === PICKING_STATE.DONE) {
    const links = await findReadableAsPerson<{
      stockPackageHistory: { id: string; parentDestId: string | null; deletedAt: string | null } | null;
    }>(
      'stockPackageHistoryStockPickingRels',
      'StockPackageHistoryStockPickingRelFilterInput',
      { stockPickingId: { eq: pickingId } },
      'stockPackageHistory { id parentDestId deletedAt }',
    );
    const histories = new Map(
      links.flatMap(({ stockPackageHistory: history }) =>
        history && !history.deletedAt ? [[history.id, { id: history.id, containerId: history.parentDestId }] as const] : [],
      ),
    );

    return found('stockPackageHistory')(mainPackageIds([...histories.values()]));
  }
  const packages = await readOpenLinePackageChain(pickingId);
  const mainIds = mainPackageIds([...packages.values()].map((row) => ({ id: row.id, containerId: row.packageDestId })));

  return found('stockPackage')(await filterReadableIds('stockPackage', 'stockPackages', mainIds));
};

const pickingNextTransferIds = async (pickingId: string) => {
  const moveIds = await readIdsAsPerson('stockMoves', 'StockMoveFilterInput', { pickingId: { eq: pickingId } });
  const links = await findReadableAsPerson<{ moveDestId: string }>(
    'stockMoveMoveRels',
    'StockMoveMoveRelFilterInput',
    { moveOrigId: { in: moveIds } },
    'moveDestId',
  );
  const destinationMoves = await findReadableAsPerson<{ pickingId: string | null }>(
    'stockMoves',
    'StockMoveFilterInput',
    { id: { in: [...new Set(links.map((link) => link.moveDestId))] } },
    'pickingId',
  );

  return nextTransferIds({
    destinationPickingIds: destinationMoves.flatMap((move) => (move.pickingId ? [move.pickingId] : [])),
    returnIds: await readReturnIds(pickingId),
  });
};

const variantReplenishmentIds = async (productId: string) => {
  const today = todayUtc();
  const orderpoints = await findReadableAsPerson<{ id: string; snoozedUntil: string | null }>(
    'stockWarehouseOrderpoints',
    'StockWarehouseOrderpointFilterInput',
    { productId: { eq: productId }, active: { eq: true } },
    'id snoozedUntil',
  );

  return idsOf(orderpoints.filter((orderpoint) => isNotSnoozed(orderpoint.snoozedUntil, today)));
};

const variantLocationIds = async (productId: string) => {
  const quants = await findReadableAsPerson<{
    id: string;
    location: { usage: string; warehouseId: string | null; deletedAt: string | null } | null;
  }>('stockQuants', 'StockQuantFilterInput', { productId: { eq: productId } }, 'id location { usage warehouseId deletedAt }');

  return idsOf(quants.filter((quant) => inInternalWarehouseLocation(quant.location)));
};

// What each button opens: the records its list shows by default.
const TARGETS: Record<StatusButton, Target> = {
  pickingReturns: { source: 'picking', find: async (pickingId) => found('stockPicking')(await readReturnIds(pickingId)) },
  pickingScraps: {
    source: 'picking',
    find: async (pickingId) => found('stockScrap')(await readIdsAsPerson('stockScraps', 'StockScrapFilterInput', { pickingId: { eq: pickingId } })),
  },
  pickingPackages: { source: 'picking', find: pickingPackages },
  pickingMoves: {
    source: 'picking',
    find: async (pickingId) => found('stockMoveLine')(await readIdsAsPerson('stockMoveLines', 'StockMoveLineFilterInput', { pickingId: { eq: pickingId } })),
  },
  pickingNextTransfers: { source: 'picking', find: async (pickingId) => found('stockPicking')(await pickingNextTransferIds(pickingId)) },
  variantHistory: {
    source: 'variant',
    find: async (productId) =>
      found('stockMoveLine')(
        await readIdsAsPerson('stockMoveLines', 'StockMoveLineFilterInput', { productId: { eq: productId }, state: { eq: MOVE_STATE.DONE } }),
      ),
  },
  variantReplenishment: { source: 'variant', find: async (productId) => found('stockWarehouseOrderpoint')(await variantReplenishmentIds(productId)) },
  variantLocations: { source: 'variant', find: async (productId) => found('stockQuant')(await variantLocationIds(productId)) },
};

const isStatusButton = (value: unknown): value is StatusButton => typeof value === 'string' && Object.keys(TARGETS).includes(value);

// The transfer's state decides which package records it shows.
const readSource = async (source: Source, recordId: string): Promise<PickingState | null> => {
  if (source === 'picking') {
    const [picking] = await findReadableAsPerson<{ state: PickingState }>(
      'stockPickings',
      'StockPickingFilterInput',
      { id: { eq: recordId } },
      'state',
    );

    if (picking === undefined) {
      throw new StockUserError(STATUS_TARGETS_MESSAGES.notFound);
    }
    return picking.state;
  }
  const [variant] = await findReadableAsPerson<{ id: string }>('productProducts', 'ProductProductFilterInput', { id: { eq: recordId } }, 'id');

  if (variant === undefined) {
    throw new StockUserError(STATUS_TARGETS_MESSAGES.notFound);
  }
  return null;
};

export const readStatusTargets = async (body: Record<string, unknown>): Promise<StatusTargetsAnswer> => {
  const { button, recordId } = body;

  if (!isStatusButton(button) || typeof recordId !== 'string' || recordId.length === 0) {
    throw new StockUserError(STATUS_TARGETS_MESSAGES.invalidRequest);
  }
  const target = TARGETS[button];
  const { objectNameSingular, ids } = await target.find(recordId, await readSource(target.source, recordId));

  return { objectNameSingular, target: statusTarget(ids) };
};
