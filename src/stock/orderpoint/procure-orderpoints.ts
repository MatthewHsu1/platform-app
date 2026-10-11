import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { checkProcurementBatch } from 'src/stock/procurement/run-procurements';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { tryProcurements } from 'src/stock/orderpoint/try-procurements';
import { planOrderpointProcurements } from 'src/stock/orderpoint/utils/plan-orderpoint-procurements.util';
import { productProducts, stockReferences } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type OrderpointProcureRow } from 'src/stock/orderpoint/types/orderpoint-procure-row.type';
import { type ProcureOrderpointsDeps } from 'src/stock/orderpoint/types/procure-orderpoints-deps.type';
import { type ProcureResult } from 'src/stock/orderpoint/types/procure-result.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';
import { chunks } from 'src/shared/utils/chunks.util';

const CHUNK = 200;

// Orders the quantity to order of each rule, a chunk at a time. A button
// (raiseUserError) checks every chunk first and refuses on any error before
// writing; should a later chunk fail once an earlier one has written, which
// cannot be undone, it answers with what was ordered and what failed. The
// daily job and the confirm hook drop the rules that fail, order the rest,
// and leave a task on each product whose rule failed or could not be run.
// `onChunkCommit` names each chunk's rules right before that chunk writes.
// `beforeWrite` runs once the checks pass, before the first write. The
// routing can still change before the run and the order then be refused
// after all; the caller undoes what it did there.
export const makeProcureOrderpoints =
  (deps: ProcureOrderpointsDeps) =>
  async (
    orderpointIds: string[],
    options: {
      raiseUserError: boolean;
      runId: string;
      origins?: ReadonlyMap<string, string[]>;
      quantities?: ReadonlyMap<string, number>;
      beforeWrite?: () => Promise<void>;
      onChunkCommit?: (orderpointIds: string[], procurementRunId: string) => Promise<void>;
    },
  ): Promise<ProcureResult> => {
    const rows = await deps.readOrderpoints([...new Set(orderpointIds)]);
    const referenceIds = [...new Set([...(options.origins?.values() ?? [])].flat())];
    const referenceNames = referenceIds.length === 0 ? new Map<string, string>() : await deps.readReferenceNames(referenceIds);
    const origins = new Map(
      [...(options.origins ?? new Map<string, string[]>())].map(([orderpointId, ids]) => [
        orderpointId,
        { referenceIds: ids, referenceNames: ids.map((id) => referenceNames.get(id) ?? '') },
      ]),
    );
    const { horizonDays, digits } = deps.settings();
    const plan = (batch: OrderpointProcureRow[]) =>
      planOrderpointProcurements({
        orderpoints: batch.flatMap((row) =>
          row.leadHorizonDate === null
            ? []
            : [{ ...row, qtyToOrder: options.quantities?.get(row.id) ?? row.qtyToOrder ?? 0, leadHorizonDate: row.leadHorizonDate }],
        ),
        horizonDays,
        digits,
        origins,
      });
    const refused = (errors: TranslatableText[]): ProcureResult => ({ kind: 'refused', errors });

    if (options.raiseUserError) {
      for (const chunk of chunks(rows, CHUNK)) {
        const planned = plan(chunk);

        try {
          if (planned.length > 0) {
            await deps.checkProcurements(planned.map((entry) => entry.procurement));
          }
        } catch (error) {
          if (error instanceof ProcurementFailure) {
            return refused(error.errors);
          }
          throw error;
        }
      }
    }
    await options.beforeWrite?.();
    const moveIds: string[] = [];
    const failures: OrderpointFailure[] = [];
    const unprocessedIds: string[] = [];
    const unprocessedTasks: OrderpointFailure[] = [];
    const parts = chunks(rows, CHUNK);
    const failuresOf = (batch: OrderpointProcureRow[], planned: { orderpointId: string }[], failed: { index: number; errors: TranslatableText[] }[]) =>
      failed.flatMap((failure) => {
        const row = batch.find((candidate) => candidate.id === planned[failure.index].orderpointId);

        return row === undefined
          ? []
          : failure.errors.map((error) => ({
              orderpointId: row.id,
              productTemplateId: row.productTemplateId,
              productName: row.productName,
              responsibleId: row.responsibleId,
              error,
            }));
      });

    for (const [partIndex, chunk] of parts.entries()) {
      let batch = chunk;

      while (batch.length > 0) {
        const planned = plan(batch);

        if (planned.length === 0) {
          break;
        }
        const { onChunkCommit } = options;
        const result = await deps.tryProcurements(
          planned.map((entry) => entry.procurement),
          {
            runId: options.runId,
            beforeCommit:
              onChunkCommit === undefined
                ? undefined
                : (claimRunId) => onChunkCommit(planned.map((entry) => entry.orderpointId), claimRunId),
          },
        );

        if (result.kind === 'done') {
          moveIds.push(...result.moveIds);
          break;
        }
        const failedIds = new Set(result.failures.map((failure) => planned[failure.index].orderpointId));

        if (options.raiseUserError) {
          if (moveIds.length === 0) {
            return refused(result.errors);
          }

          return {
            kind: 'done',
            moveIds,
            failures: failuresOf(batch, planned, result.failures),
            // Rules with nothing to order were never going to be ordered.
            unprocessedIds: [
              ...planned.flatMap((entry) => (failedIds.has(entry.orderpointId) ? [] : [entry.orderpointId])),
              ...parts.slice(partIndex + 1).flatMap((part) => plan(part).map((entry) => entry.orderpointId)),
            ],
          };
        }

        // The batch fails but no rule fails alone: nothing can be dropped.
        // A task on each product keeps the rules from being missed silently.
        if (failedIds.size === 0) {
          unprocessedIds.push(...planned.map((entry) => entry.orderpointId));
          unprocessedTasks.push(
            ...batch
              .filter((row) => planned.some((entry) => entry.orderpointId === row.id))
              .map((row) => ({
                orderpointId: row.id,
                productTemplateId: row.productTemplateId,
                productName: row.productName,
                responsibleId: row.responsibleId,
                error: { message: ORDERPOINT_MESSAGES.unprocessed, values: { rule: row.name } },
              })),
          );
          break;
        }
        failures.push(...failuresOf(batch, planned, result.failures));
        batch = batch.filter((row) => !failedIds.has(row.id));
      }
    }
    await deps.addIssueTasks([...failures, ...unprocessedTasks]);

    return { kind: 'done', moveIds, failures, unprocessedIds };
  };

const readOrderpoints = async (orderpointIds: string[]): Promise<OrderpointProcureRow[]> => {
  if (orderpointIds.length === 0) {
    return [];
  }
  const rows = await stockWarehouseOrderpoints.find<{
    id: string;
    name: string | null;
    productId: string | null;
    locationId: string | null;
    warehouseId: string | null;
    routeId: string | null;
    qtyToOrder: number | null;
    leadHorizonDate: string | null;
  }>({ id: { in: orderpointIds } }, 'id name productId locationId warehouseId routeId qtyToOrder leadHorizonDate');
  const products = await productProducts.find<{
    id: string;
    name: string | null;
    productTmplId: string;
    productTmpl: { uomId: string; responsibleId: string | null } | null;
  }>(
    { id: { in: [...new Set(rows.flatMap((row) => (row.productId === null ? [] : [row.productId])))] } },
    'id name productTmplId productTmpl { deletedAt uomId responsibleId }',
  );
  const productById = new Map(products.map((product) => [product.id, product]));

  return rows.flatMap((row) => {
    const product = row.productId === null ? undefined : productById.get(row.productId);

    if (row.productId === null || row.locationId === null || product?.productTmpl == null) {
      return [];
    }

    return [
      {
        id: row.id,
        name: row.name ?? '',
        productId: row.productId,
        productUomId: product.productTmpl.uomId,
        locationId: row.locationId,
        warehouseId: row.warehouseId,
        routeId: row.routeId,
        qtyToOrder: row.qtyToOrder,
        leadHorizonDate: row.leadHorizonDate,
        productTemplateId: product.productTmplId,
        productName: product.name ?? '',
        responsibleId: product.productTmpl.responsibleId,
      },
    ];
  });
};

export const procureOrderpoints = makeProcureOrderpoints({
  readOrderpoints,
  readReferenceNames: async (referenceIds) =>
    new Map(
      (await stockReferences.find<{ id: string; name: string | null }>({ id: { in: referenceIds } }, 'id name')).map((reference) => [
        reference.id,
        reference.name ?? '',
      ]),
    ),
  checkProcurements: (procurements) => checkProcurementBatch(procurements),
  tryProcurements,
  addIssueTasks: addReplenishmentIssueTasks,
  settings: () => {
    const settings = readStockSettings();

    return { horizonDays: settings.replenishmentHorizonDays, digits: settings.productUnitDigits };
  },
});
