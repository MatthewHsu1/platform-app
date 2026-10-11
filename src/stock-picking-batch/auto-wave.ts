import { claimKey, heldClaimKeys } from 'src/shared/claims/claim';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import {
  stockMoveLines,
  stockMoves,
  stockPickingBatches,
  stockPickings,
  stockPickingTypes,
  waveCategoryLinks,
  waveLocationLinks,
} from 'src/stock-picking-batch/stock-picking-batch-records';
import { type AutoWaveLine } from 'src/stock-picking-batch/types/auto-wave-line.type';
import { type AutoWaveType } from 'src/stock-picking-batch/types/auto-wave-type.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type TransferForGroups } from 'src/stock-picking-batch/types/transfer-for-groups.type';
import { planAutoWave } from 'src/stock-picking-batch/utils/plan-auto-wave.util';
import {
  CONTACT_GROUP_SELECTION,
  contactGroupValues,
  TRANSFER_GROUP_SELECTION,
  transferGroupValues,
} from 'src/stock-picking-batch/utils/transfer-partner.util';
import { wavesAutomatically } from 'src/stock-picking-batch/utils/waves-automatically.util';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { StockUserError } from 'src/stock/stock-errors';
import { productCategories, stockLocations } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';

type LineRow = {
  id: string;
  pickingId: string | null;
  moveId: string | null;
  productId: string;
  quantity: number | null;
  locationId: string;
  locationDestId: string;
};
type PickingRow = TransferForGroups & { id: string; state: string; pickingTypeId: string | null; batchId: string | null; createdAt: string };
type TypeRow = Omit<AutoWaveType, 'waveCategoryIds' | 'waveLocationIds'> & { id: string };
type WaveRow = { id: string; name: string | null; pickingTypeId: string; state: BatchState };
type MoveRow = Pick<TransferForGroups, 'person' | 'company'> & { id: string; createdAt: string };

const TYPE_SELECTION =
  'id autoBatch batchGroupByPartner batchGroupByDestination batchGroupBySrcLoc batchGroupByDestLoc waveGroupByProduct waveGroupByCategory waveGroupByLocation batchMaxLines batchMaxPickings batchAutoConfirm';

// A location's path lists the ids from the root down to itself, so the paths
// of the locations in play give every parent link without reading the parents.
const parentsFromPaths = (paths: (string | null)[]) => {
  const parents = new Map<string, string | null>();

  for (const path of paths) {
    const ids = (path ?? '').split('/').filter((id) => id !== '');

    ids.forEach((id, index) => parents.set(id, index === 0 ? null : ids[index - 1]));
  }
  return parents;
};

const readTypes = async (typeIds: string[]) => {
  const rows = (await stockPickingTypes.find<TypeRow>({ id: { in: typeIds } }, TYPE_SELECTION)).filter(wavesAutomatically);
  const ids = rows.map((row) => row.id);
  const [categoryLinks, locationLinks] = await Promise.all([
    waveCategoryLinks.find<{ stockPickingTypeId: string; productCategoryId: string }>(
      { stockPickingTypeId: { in: ids } },
      'stockPickingTypeId productCategoryId',
    ),
    waveLocationLinks.find<{
      stockPickingTypeId: string;
      stockLocationId: string;
      stockLocation: { completeName: string | null } | null;
    }>({ stockPickingTypeId: { in: ids } }, 'stockPickingTypeId stockLocationId stockLocation { completeName deletedAt }'),
  ]);
  const waveLocationNames = new Map(
    locationLinks.flatMap((link) => (link.stockLocation === null ? [] : [[link.stockLocationId, link.stockLocation.completeName ?? ''] as const])),
  );
  const types = new Map<string, AutoWaveType>(
    rows.map((row) => [
      row.id,
      {
        ...row,
        waveCategoryIds: categoryLinks.filter((link) => link.stockPickingTypeId === row.id).map((link) => link.productCategoryId),
        waveLocationIds: locationLinks
          .filter((link) => link.stockPickingTypeId === row.id && waveLocationNames.has(link.stockLocationId))
          .map((link) => link.stockLocationId)
          .sort((left, right) => (waveLocationNames.get(left) ?? '').localeCompare(waveLocationNames.get(right) ?? '') || left.localeCompare(right)),
      },
    ]),
  );

  return { types, waveLocationNames };
};

// The open waves of the types with their transfers, moves and lines. A wave
// whose Validate is running takes no line, also when the call comes from a
// save that cannot know which batches are being validated.
const readOpenWaves = async (typeIds: string[], batchesToValidate: string[]) => {
  const rows = await stockPickingBatches.find<WaveRow>(
    { isWave: { eq: true }, pickingTypeId: { in: typeIds }, state: { in: [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS] } },
    'id name pickingTypeId state',
  );
  const validating = new Set(await heldClaimKeys(rows.map((row) => claimKey('batchValidate', row.id))));
  const waves = rows.filter((row) => !batchesToValidate.includes(row.id) && !validating.has(claimKey('batchValidate', row.id)));
  const pickings = await stockPickings.find<TransferForGroups & { id: string; batchId: string }>(
    { batchId: { in: waves.map((wave) => wave.id) } },
    `id batchId ${TRANSFER_GROUP_SELECTION}`,
  );
  const pickingIds = pickings.map((picking) => picking.id);
  const [moves, lines] = await Promise.all([
    stockMoves.find<{ id: string; pickingId: string }>({ pickingId: { in: pickingIds } }, 'id pickingId'),
    stockMoveLines.find<{ pickingId: string; moveId: string | null; locationId: string; productId: string }>(
      { pickingId: { in: pickingIds } },
      'pickingId moveId locationId productId',
    ),
  ]);

  return { waves, pickings, moves, lines };
};

// Puts move lines into waves when their operation type waves automatically.
// Reservation calls it with the lines of the moves it reserved; Validate calls
// it for the transfers that left a batch and the backorders, waving them even
// when they are not ready (`skipWaveableCheck`) and keeping them out of the
// batches being validated.
export const autoWave = async (
  moveLineIds: string[],
  options: { skipWaveableCheck?: boolean; batchesToValidate?: string[] } = {},
): Promise<void> => {
  const batchesToValidate = options.batchesToValidate ?? [];
  const lineRows = (await stockMoveLines.find<LineRow>(
    { id: { in: distinctIds(moveLineIds) } },
    'id pickingId moveId productId quantity locationId locationDestId',
  )).filter((row) => row.pickingId !== null && row.moveId !== null);
  const pickings = await stockPickings.find<PickingRow>(
    { id: { in: distinctIds(lineRows.map((row) => row.pickingId)) } },
    `id state pickingTypeId batchId createdAt ${TRANSFER_GROUP_SELECTION}`,
  );
  const { types, waveLocationNames } = await readTypes(distinctIds(pickings.map((picking) => picking.pickingTypeId)));

  if (types.size === 0) {
    return;
  }
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const rows = lineRows.filter((row) => types.has(pickingById.get(row.pickingId as string)?.pickingTypeId ?? ''));
  const typeIds = [...types.keys()];
  const [open, ownBatches, moves] = await Promise.all([
    readOpenWaves(typeIds, batchesToValidate),
    stockPickingBatches.find<{ id: string; isWave: boolean }>(
      { id: { in: distinctIds(rows.map((row) => pickingById.get(row.pickingId as string)?.batchId)) } },
      'id isWave',
    ),
    stockMoves.find<MoveRow>({ id: { in: distinctIds(rows.map((row) => row.moveId)) } }, `id createdAt ${CONTACT_GROUP_SELECTION}`),
  ]);
  const products = await readStockProducts([...rows, ...open.lines].map((row) => row.productId));
  const categoryNames = new Map(
    (
      await productCategories.find<{ id: string; completeName: string | null }>(
        { id: { in: distinctIds([...products.values()].map((product) => product.categId)) } },
        'id completeName',
      )
    ).map((category) => [category.id, category.completeName ?? '']),
  );
  const locations = await stockLocations.findIncludingDeleted<{ id: string; parentPath: string | null }>(
    { id: { in: distinctIds([...rows, ...open.lines].map((row) => row.locationId)) } },
    'id parentPath',
  );
  const waveIds = new Set(ownBatches.filter((batch) => batch.isWave).map((batch) => batch.id));
  const moveById = new Map(moves.map((move) => [move.id, move]));

  const lines = rows.map((row): AutoWaveLine => {
    const picking = pickingById.get(row.pickingId as string) as PickingRow;
    const product = products.get(row.productId);
    const categoryId = product?.categId ?? null;
    const move = moveById.get(row.moveId as string);
    const moveContact = move === undefined ? { partnerKey: null, countryKey: null } : contactGroupValues(move);

    return {
      id: row.id,
      pickingId: picking.id,
      pickingCreatedAt: picking.createdAt,
      moveId: row.moveId as string,
      moveCreatedAt: move?.createdAt ?? '',
      pickingTypeId: picking.pickingTypeId as string,
      pickingState: picking.state,
      quantity: row.quantity ?? 0,
      inWave: picking.batchId !== null && waveIds.has(picking.batchId),
      productId: row.productId,
      productName: product?.displayName ?? '',
      categoryId,
      categoryCompleteName: categoryId === null ? '' : (categoryNames.get(categoryId) ?? ''),
      locationId: row.locationId,
      locationDestId: row.locationDestId,
      partnerKey: moveContact.partnerKey,
      countryKey: moveContact.countryKey,
      groupValues: transferGroupValues(picking),
    };
  });
  const plan = planAutoWave({
    lines,
    types,
    existingWaves: open.waves.map((wave) => {
      const wavePickings = open.pickings.filter((picking) => picking.batchId === wave.id);
      const ids = new Set(wavePickings.map((picking) => picking.id));

      return {
        id: wave.id,
        name: wave.name ?? '',
        pickingTypeId: wave.pickingTypeId,
        state: wave.state,
        moveCount: open.moves.filter((move) => ids.has(move.pickingId)).length,
        pickingCount: wavePickings.length,
        lines: open.lines
          .filter((line) => ids.has(line.pickingId) && line.moveId !== null)
          .map((line) => ({
            locationId: line.locationId,
            productId: line.productId,
            categoryId: products.get(line.productId)?.categId ?? null,
            moveId: line.moveId as string,
            pickingId: line.pickingId,
          })),
        pickingGroups: wavePickings.map(transferGroupValues),
      };
    }),
    locationParents: parentsFromPaths(locations.map((location) => location.parentPath)),
    locationCompleteNames: waveLocationNames,
    skipWaveableCheck: options.skipWaveableCheck === true,
    batchesToValidate,
    digits: readStockSettings().productUnitDigits,
  });

  if (plan.existing.length === 0 && plan.created.length === 0) {
    return;
  }
  // Loaded here, not at the top: Add to wave splits moves, and the split
  // reaches reservation, which calls this function.
  const { autoAddToWave } = await import('src/stock-picking-batch/add-to-wave');
  // A refusal means the rows changed since the plan (a wave closed, a transfer
  // moved on): those lines wait for their next reservation, like held ones.
  // Only an unexpected error is reported, and one wave that fails must not
  // keep the other lines from theirs.
  const errors = errorCollector();
  const waveLines = async (lineIds: string[], waveId: string | null, description: string | null) => {
    try {
      await autoAddToWave({ lineIds, waveId, description });
    } catch (error) {
      if (!(error instanceof StockUserError)) {
        throw error;
      }
    }
  };

  for (const join of plan.existing) {
    await errors.run(`auto wave into ${join.waveId}`, () => waveLines(join.lineIds, join.waveId, null));
  }
  for (const wave of plan.created) {
    await errors.run(`auto wave ${wave.description}`, () =>
      waveLines(wave.lineIds, null, wave.description === '' ? null : wave.description),
    );
  }
  errors.throwIfAny();
};
