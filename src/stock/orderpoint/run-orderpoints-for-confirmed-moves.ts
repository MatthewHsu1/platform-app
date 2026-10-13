import { readMoveReferences } from 'src/stock/move/move-links';
import {
  releaseOrderpointClaims,
  releaseOrderpointClaimsUnlessWritten,
  takeOrderpointClaims,
} from 'src/stock/orderpoint/orderpoint-claims';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { procureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { selectOrderpointsForMoves } from 'src/stock/orderpoint/utils/select-orderpoints-for-moves.util';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoves } from 'src/stock/stock-records';
import { type OrderpointHookDeps } from 'src/stock/orderpoint/types/orderpoint-hook-deps.type';

// Marking a transfer as to do orders at once for the automatic rules its
// running moves draw stock from. The rules are recomputed first: a move change
// recomputes them only later, in a job. A rule another run holds is left to
// that run. Procurement failures become tasks on the product; any other error
// stops the run, and its rules stay claimed when it had begun writing.
export const makeRunOrderpointsForConfirmedMoves = (deps: OrderpointHookDeps) => async (moveIds: string[]) => {
  const ids = [...new Set(moveIds)];

  if (ids.length === 0) {
    return;
  }
  const moves = await deps.readMoves(ids);
  const orderpoints = moves.length === 0 ? [] : await deps.readAutoOrderpoints([...new Set(moves.map((move) => move.productId))]);

  if (orderpoints.length === 0) {
    return;
  }
  const locations = await deps.readLocations([
    ...new Set([...moves.flatMap((move) => [move.locationId, move.locationDestId]), ...orderpoints.map((orderpoint) => orderpoint.locationId)]),
  ]);
  const completeNames = new Map(locations.map((location) => [location.id, location.completeName ?? '']));
  const { orderpointIds, origins } = selectOrderpointsForMoves({
    moves,
    orderpoints: orderpoints.map((orderpoint) => ({
      ...orderpoint,
      locationCompleteName: completeNames.get(orderpoint.locationId) ?? '',
    })),
    locationPaths: new Map(locations.flatMap((location) => (location.parentPath === null ? [] : [[location.id, location.parentPath] as const]))),
  });

  if (orderpointIds.length === 0) {
    return;
  }
  const runId = deps.newRunId();
  const { taken } = await deps.takeOrderpointClaims(orderpointIds, runId);

  if (taken.length === 0) {
    return;
  }
  try {
    const { failures } = await deps.recomputeOrderpoint(taken);
    const failed = new Set(failures.map((failure) => failure.orderpointId));

    await deps.addIssueTasks(failures);
    await deps.procureOrderpoints(
      taken.filter((id) => !failed.has(id)),
      { raiseUserError: false, runId, origins },
    );
  } catch (error) {
    await deps.releaseOrderpointClaimsUnlessWritten(taken, runId);
    throw error;
  }
  await deps.releaseOrderpointClaims(taken, runId);
};

export const runOrderpointsForConfirmedMoves = makeRunOrderpointsForConfirmedMoves({
  readMoves: async (moveIds) => {
    const rows = await stockMoves.find<{
      id: string;
      productId: string;
      state: string;
      locationId: string | null;
      locationDestId: string | null;
      productQty: number | null;
    }>({ id: { in: moveIds } }, 'id productId state locationId locationDestId productQty');
    const references = await readMoveReferences(rows.map((row) => row.id));

    return rows.flatMap((row) =>
      row.locationId === null || row.locationDestId === null
        ? []
        : [
            {
              id: row.id,
              productId: row.productId,
              state: row.state,
              locationId: row.locationId,
              locationDestId: row.locationDestId,
              productQty: row.productQty ?? 0,
              referenceIds: references.get(row.id) ?? [],
            },
          ],
    );
  },
  readAutoOrderpoints: async (productIds) =>
    (
      await stockWarehouseOrderpoints.find<{
        id: string;
        productId: string | null;
        trigger: 'AUTO' | 'MANUAL';
        active: boolean;
        locationId: string | null;
        createdAt: string;
        productMinQty: number;
      }>(
        { productId: { in: productIds }, trigger: { eq: ORDERPOINT_TRIGGER.AUTO }, active: { eq: true } },
        'id productId trigger active locationId createdAt productMinQty',
      )
    ).flatMap((row) =>
      row.productId === null || row.locationId === null ? [] : [{ ...row, productId: row.productId, locationId: row.locationId }],
    ),
  readLocations: (locationIds) =>
    stockLocations.findIncludingDeleted<{ id: string; parentPath: string | null; completeName: string | null }>(
      { id: { in: locationIds } },
      'id parentPath completeName',
    ),
  takeOrderpointClaims,
  releaseOrderpointClaims,
  releaseOrderpointClaimsUnlessWritten,
  recomputeOrderpoint,
  addIssueTasks: addReplenishmentIssueTasks,
  procureOrderpoints,
  newRunId: () => crypto.randomUUID(),
});
