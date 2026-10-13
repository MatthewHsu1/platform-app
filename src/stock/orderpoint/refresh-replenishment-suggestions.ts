import { enqueueJobs } from 'twenty-sdk/logic-function';

import { claimKey, withClaim } from 'src/shared/claims/claim';
import { graphqlClaimStore } from 'src/shared/claims/claim-store';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { translate } from 'src/shared/i18n/translate';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { destroyProcessedSuggestions } from 'src/stock/orderpoint/destroy-processed-suggestions';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { readLocationQuantities } from 'src/stock/orderpoint/location-quantities';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { readOrderpointRules } from 'src/stock/orderpoint/orderpoint-routing';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { type RefreshResult } from 'src/stock/orderpoint/types/refresh-result.type';
import { orderpointLeadTimes } from 'src/stock/orderpoint/utils/orderpoint-lead-times.util';
import { planRefreshContinuation } from 'src/stock/orderpoint/utils/plan-refresh-continuation.util';
import { planSuggestionRows } from 'src/stock/orderpoint/utils/plan-suggestion-rows.util';
import { replenishmentCandidates } from 'src/stock/orderpoint/utils/replenishment-candidates.util';
import { firstWarehouse } from 'src/stock/picking-type/rules/picking-type-defaults';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { productProducts, stockLocations, stockMoves, stockQuants, stockWarehouses } from 'src/stock/stock-records';
import { WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

type ReplenishLocation = { id: string; parentPath: string; warehouseId: string | null };

type RefreshContext = {
  digits: number;
  horizonDays: number;
  today: string;
  name: string;
  replenishLocations: ReplenishLocation[];
  locationPaths: Map<string, string>;
  locationWarehouseIds: Map<string, string | null>;
  firstWarehouseId: string | null;
};

type LocationOutcome = { kind: 'done'; createdIds: string[] } | { kind: 'refused'; error: TranslatableText; productId: string };

const CLAIM_KEY = claimKey('replenishment', 'refresh');
// Marks the claim of a run that goes on from an earlier one, so a click meanwhile
// is told the list is still filling.
const CONTINUATION_STEP = 'continuation';
// Twenty grants an app at most 3 reruns of a job.
const RETRY_LIMIT = 3;

// Active variants of products that keep stock.
const readStorableIds = async (productIds: string[]) => {
  const variants = await productProducts.find<{ id: string; active: boolean | null; productTmpl: { isStorable: boolean | null } | null }>(
    { id: { in: productIds } },
    'id active productTmpl { deletedAt isStorable }',
  );

  return new Set(variants.filter((variant) => variant.active !== false && variant.productTmpl?.isStorable === true).map((variant) => variant.id));
};

// A person may have added a rule for one of the pairs since they were read:
// those pairs are left to that rule. The id holds the day, so a suggestion a
// person moved to another pair frees its first pair from the next day on.
const createSuggestions = async (locationId: string, rows: ReturnType<typeof planSuggestionRows>, name: string, today: string) => {
  const planned = rows.map((row) => ({
    id: derivedId('replenishmentSuggestion', today, row.productId, row.locationId),
    data: {
      ...row,
      name,
      trigger: ORDERPOINT_TRIGGER.MANUAL,
      productMinQty: 0,
      productMaxQty: 0,
      autoCreated: true,
    },
  }));

  try {
    return await createMissingRows(stockWarehouseOrderpoints, planned);
  } catch (error) {
    const plannedIds = new Set(planned.map((plan) => plan.id));
    const takenProductIds = new Set(
      (
        await stockWarehouseOrderpoints.findIncludingDeleted<{ id: string; productId: string }>(
          { productId: { in: rows.map((row) => row.productId) }, locationId: { eq: locationId } },
          'id productId',
        )
      ).flatMap((row) => (plannedIds.has(row.id) ? [] : [row.productId])),
    );

    if (takenProductIds.size === 0) {
      throw error;
    }
    return createMissingRows(
      stockWarehouseOrderpoints,
      planned.filter((plan) => !takenProductIds.has(plan.data.productId)),
    );
  }
};

const refreshLocation = async (location: ReplenishLocation, context: RefreshContext): Promise<LocationOutcome> => {
  const subtreeIds = [...context.locationPaths].flatMap(([id, path]) => (path.startsWith(location.parentPath) ? [id] : []));
  const [quants, moves] = await Promise.all([
    stockQuants.find<{ productId: string; locationId: string; quantity: number | null }>(
      { locationId: { in: subtreeIds } },
      'productId locationId quantity',
    ),
    stockMoves.find<{
      productId: string;
      locationId: string | null;
      locationDestId: string | null;
      locationFinalId: string | null;
      productQty: number | null;
    }>(
      {
        state: { in: OPEN_MOVE_STATES_FOR_FORECAST },
        or: [{ locationId: { in: subtreeIds } }, { locationDestId: { in: subtreeIds } }, { locationFinalId: { in: subtreeIds } }],
      },
      'productId locationId locationDestId locationFinalId productQty',
    ),
  ]);
  const found = replenishmentCandidates({
    location,
    replenishLocations: context.replenishLocations,
    locationPaths: context.locationPaths,
    quants,
    moves,
    digits: context.digits,
  });

  if (found.length === 0) {
    return { kind: 'done', createdIds: [] };
  }
  const storable = await readStorableIds(found);
  const productIds = found.filter((productId) => storable.has(productId));
  const routing = await readOrderpointRules(
    productIds.map((productId) => ({ orderpointId: productId, productId, locationId: location.id, routeId: null })),
  );
  // Products are read together per end day: lead days plus the horizon.
  const endDays = new Map<string, string>();

  for (const productId of productIds) {
    const rules = routing.get(productId);

    if (rules?.kind === 'loop') {
      return { kind: 'refused', error: rules.error, productId };
    }
    if (rules !== undefined) {
      endDays.set(productId, orderpointLeadTimes({ today: context.today, rules: rules.rules, horizonDays: context.horizonDays }).leadHorizonDate);
    }
  }
  if (endDays.size === 0) {
    return { kind: 'done', createdIds: [] };
  }
  const quantities = await readLocationQuantities({
    productIds: [...endDays.keys()],
    locationId: location.id,
    toDays: [...new Set(endDays.values())],
    digits: context.digits,
  });
  const toRefill = [...endDays].flatMap(([productId, endDay]) => {
    const forecast = quantities.get(endDay)?.get(productId)?.virtualAvailable ?? 0;

    return compareAtDigits(forecast, 0, context.digits) < 0 ? [{ productId, locationId: location.id }] : [];
  });

  if (toRefill.length === 0) {
    return { kind: 'done', createdIds: [] };
  }
  const orderpoints = await stockWarehouseOrderpoints.findIncludingDeleted<{ productId: string; locationId: string }>(
    { productId: { in: toRefill.map((row) => row.productId) }, locationId: { eq: location.id } },
    'productId locationId',
  );
  const createdIds = await createSuggestions(
    location.id,
    planSuggestionRows({
      toRefill,
      orderpoints,
      locationWarehouseIds: context.locationWarehouseIds,
      firstWarehouseId: context.firstWarehouseId,
    }),
    context.name,
    context.today,
  );

  if (createdIds.length > 0) {
    // The list shows rows with something to order: fill the quantities before it opens.
    const { failures } = await recomputeOrderpoint(createdIds);

    await addReplenishmentIssueTasks(failures);
  }
  return { kind: 'done', createdIds };
};

// One replenish location at a time, so a stopped or continued run keeps what
// it made. Only a fresh run removes the processed rows: a continuation would
// remove the rows its own earlier part made.
const runRefresh = async ({
  runId,
  deadlineAt,
  locationIds,
  locale,
}: {
  runId: string;
  deadlineAt: number;
  locationIds?: string[];
  locale: string;
}): Promise<RefreshResult> => {
  const settings = readStockSettings();

  if (locationIds === undefined) {
    await destroyProcessedSuggestions();
  } else {
    await graphqlClaimStore.updateWhere({ key: CLAIM_KEY, runId }, { progress: { steps: { [CONTINUATION_STEP]: { done: false } } } });
  }
  const [locations, warehouses] = await Promise.all([
    stockLocations.find<{
      id: string;
      parentPath: string | null;
      warehouseId: string | null;
      replenishLocation: boolean | null;
      active: boolean | null;
    }>({}, 'id parentPath warehouseId replenishLocation active'),
    stockWarehouses.find<WarehouseRow>({ active: { eq: true } }, WAREHOUSE_ROW),
  ]);
  const replenishLocations = locations
    .flatMap((location) =>
      location.replenishLocation === true && location.active !== false && location.parentPath !== null
        ? [{ id: location.id, parentPath: location.parentPath, warehouseId: location.warehouseId }]
        : [],
    )
    .sort((left, right) => left.parentPath.localeCompare(right.parentPath));
  const todo = locationIds === undefined ? replenishLocations : replenishLocations.filter((location) => locationIds.includes(location.id));
  const context: RefreshContext = {
    digits: settings.productUnitDigits,
    horizonDays: settings.replenishmentHorizonDays,
    today: todayUtc(),
    name: translate(locale, ORDERPOINT_MESSAGES.replenishmentReport),
    replenishLocations,
    locationPaths: new Map(locations.flatMap((location) => (location.parentPath === null ? [] : [[location.id, location.parentPath] as const]))),
    locationWarehouseIds: new Map(locations.map((location) => [location.id, location.warehouseId])),
    firstWarehouseId: firstWarehouse(warehouses)?.id ?? null,
  };
  const createdIds: string[] = [];

  for (const [index, location] of todo.entries()) {
    if (index > 0 && Date.now() > deadlineAt) {
      return { kind: 'continued', created: createdIds.length, remainingLocationIds: todo.slice(index).map((left) => left.id) };
    }
    const outcome = await refreshLocation(location, context);

    if (outcome.kind === 'refused') {
      // A refused refresh makes nothing; rows an earlier part of a continued
      // refresh made stay, as each part stands on its own.
      await stockWarehouseOrderpoints.destroyMany(createdIds);
      return outcome;
    }
    createdIds.push(...outcome.createdIds);
  }
  return { kind: 'done', created: createdIds.length };
};

// Removes the processed suggestion rows, then adds a manual rule for every
// product that will go negative in a replenish location. Near the deadline the
// rest goes on in a background job; `locationIds` names what such a job has
// left to do.
export const refreshReplenishmentSuggestions = async ({
  deadlineAt,
  locationIds,
  locale = 'en',
}: {
  deadlineAt: number;
  locationIds?: string[];
  locale?: string;
}): Promise<RefreshResult> => {
  const claimed = await withClaim(CLAIM_KEY, (runId) => runRefresh({ runId, deadlineAt, locationIds, locale }));

  if (claimed.kind === 'held') {
    const holder = await graphqlClaimStore.findByKey(CLAIM_KEY);

    return { kind: 'held', continuing: holder?.progress?.steps[CONTINUATION_STEP] !== undefined };
  }
  // Only once the claim is free: a job started while it is still held would stop at once.
  if (claimed.result.kind === 'continued') {
    const { jobId, payload, delayMs } = planRefreshContinuation({
      locationIds: claimed.result.remainingLocationIds,
      locale,
      now: new Date(),
    });

    await enqueueJobs({
      logicFunctionUniversalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.refreshJob,
      jobs: [{ jobId, payload }],
      delayMs,
      retryLimit: RETRY_LIMIT,
    });
  }
  return claimed.result;
};

// A refusal no one clicked for (a background run) goes to the product as a
// task, as the other replenishment issues do.
export const addRefreshRefusalTask = async ({ productId, error }: { productId: string; error: TranslatableText }) => {
  const [variant] = await productProducts.find<{
    id: string;
    name: string | null;
    productTmplId: string;
    productTmpl: { responsibleId: string | null } | null;
  }>({ id: { eq: productId } }, 'id name productTmplId productTmpl { deletedAt responsibleId }');

  if (variant === undefined) {
    return;
  }
  // No rule exists for the pair yet; the task is keyed by product and text.
  await addReplenishmentIssueTasks([
    {
      productTemplateId: variant.productTmplId,
      productName: variant.name ?? '',
      responsibleId: variant.productTmpl?.responsibleId ?? null,
      error,
    },
  ]);
};
