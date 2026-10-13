import { findMany } from 'src/shared/triggers/records';
import { groupBy } from 'src/shared/utils/group-by.util';
import { findSeedLocationId } from 'src/stock/location/read-locations';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { applyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { settleQuantDelta } from 'src/stock/quant/settle-quant-delta';
import {
  companiesForRouting,
  peopleForRouting,
  productCategories,
  productProducts,
  productTemplates,
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockPickingTypes,
  stockReferenceMoveRels,
  stockRouteMoves,
} from 'src/stock/routing-records';
import { MOVE_STATE, PRIORITY, PROCURE_METHOD, STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { type PushStore } from 'src/stock/procurement/types/push-store.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PushMove } from 'src/stock/utils/procurement/types/push-move.type';

type DoneMoveRow = {
  id: string;
  state: MoveState;
  productId: string;
  productUomId: string | null;
  quantity: number | null;
  productUomQty: number | null;
  locationId: string | null;
  locationDestId: string | null;
  locationFinalId: string | null;
  date: string;
  dateDeadline: string | null;
  warehouseId: string | null;
  pickingTypeId: string | null;
  pickingId: string | null;
  packagingUomId: string | null;
  isInventory: boolean | null;
  originReturnedMoveId: string | null;
  origin: string | null;
  companyId: string | null;
  personId: string | null;
  priority: string | null;
  restrictPartnerId: string | null;
  descriptionPickingManual: string | null;
  sequence: number | null;
};

type ReadyMove = DoneMoveRow & { productUomId: string; locationId: string; locationDestId: string };

const MOVE_SELECTION =
  'id state productId productUomId quantity productUomQty locationId locationDestId locationFinalId date dateDeadline warehouseId pickingTypeId pickingId packagingUomId isInventory originReturnedMoveId origin companyId personId priority restrictPartnerId descriptionPickingManual sequence';

const distinct = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

// The done moves with everything their push reads, as the application.
const readDoneMoves = async (moveIds: string[]): Promise<PushMove[]> => {
  const moves = (await stockMoves.find<DoneMoveRow>({ id: { in: distinct(moveIds) } }, MOVE_SELECTION)).filter(
    (move): move is ReadyMove =>
      move.state === MOVE_STATE.DONE && move.productUomId !== null && move.locationId !== null && move.locationDestId !== null,
  );

  if (moves.length === 0) {
    return [];
  }
  const ids = moves.map((move) => move.id);
  const { destinationLinks, routeLinks, referenceLinks, variants, pickings, types, people, companies } = await findMany<{
    destinationLinks: { moveOrigId: string; moveDestId: string }[];
    routeLinks: { stockMoveId: string; stockRouteId: string }[];
    referenceLinks: { moveId: string; referenceId: string }[];
    variants: { id: string; name: string | null; defaultCode: string | null; barcode: string | null; productTmplId: string }[];
    pickings: { id: string; name: string | null; origin: string | null; priority: string | null; pickingTypeCode: string | null }[];
    types: { id: string; warehouseId: string | null }[];
    people: { id: string; propertyStockCustomerId: string | null }[];
    companies: { id: string; propertyStockCustomerId: string | null }[];
  }>({
    destinationLinks: { of: stockMoveMoveRels, filter: { moveOrigId: { in: ids } }, selection: 'moveOrigId moveDestId' },
    routeLinks: { of: stockRouteMoves, filter: { stockMoveId: { in: ids } }, selection: 'stockMoveId stockRouteId' },
    referenceLinks: { of: stockReferenceMoveRels, filter: { moveId: { in: ids } }, selection: 'moveId referenceId' },
    variants: {
      of: productProducts,
      filter: { id: { in: distinct(moves.map((move) => move.productId)) } },
      selection: 'id name defaultCode barcode productTmplId',
    },
    pickings: {
      of: stockPickings,
      filter: { id: { in: distinct(moves.map((move) => move.pickingId)) } },
      selection: 'id name origin priority pickingTypeCode',
    },
    types: { of: stockPickingTypes, filter: { id: { in: distinct(moves.map((move) => move.pickingTypeId)) } }, selection: 'id warehouseId' },
    people: { of: peopleForRouting, filter: { id: { in: distinct(moves.map((move) => move.personId)) } }, selection: 'id propertyStockCustomerId' },
    companies: {
      of: companiesForRouting,
      filter: { id: { in: distinct(moves.map((move) => move.companyId)) } },
      selection: 'id propertyStockCustomerId',
    },
  });
  const { linkedMoves, templates } = await findMany<{
    linkedMoves: { id: string; locationId: string | null; locationDestId: string | null; ruleId: string | null }[];
    templates: { id: string; categId: string | null }[];
  }>({
    linkedMoves: {
      of: stockMoves,
      filter: { id: { in: distinct([...destinationLinks.map((link) => link.moveDestId), ...moves.map((move) => move.originReturnedMoveId)]) } },
      selection: 'id locationId locationDestId ruleId',
    },
    templates: { of: productTemplates, filter: { id: { in: distinct(variants.map((variant) => variant.productTmplId)) } }, selection: 'id categId' },
  });
  const categories = await productCategories.find<{ id: string; name: string | null; completeName: string | null }>(
    { id: { in: distinct(templates.map((template) => template.categId)) } },
    'id name completeName',
  );
  const customersId = people.length + companies.length === 0 ? null : await findSeedLocationId(STOCK_SEED_KEYS.customers);
  const byId = <TRow extends { id: string }>(rows: TRow[]) => new Map(rows.map((row) => [row.id, row]));
  const [variantById, pickingById, typeById, personById, companyById, linkedById, templateById, categoryById] = [
    byId(variants),
    byId(pickings),
    byId(types),
    byId(people),
    byId(companies),
    byId(linkedMoves),
    byId(templates),
    byId(categories),
  ];
  const destinationsOf = groupBy(destinationLinks, (link) => link.moveOrigId);
  const routesOf = groupBy(routeLinks, (link) => link.stockMoveId);
  const referencesOf = groupBy(referenceLinks, (link) => link.moveId);

  return moves.map((move) => {
    const variant = variantById.get(move.productId);
    const categId = variant === undefined ? null : (templateById.get(variant.productTmplId)?.categId ?? null);
    const category = categId === null ? undefined : categoryById.get(categId);
    const picking = move.pickingId === null ? undefined : pickingById.get(move.pickingId);
    // "The partner" of a move is its person when set, else its company.
    const partner = move.personId !== null ? personById.get(move.personId) : move.companyId !== null ? companyById.get(move.companyId) : undefined;
    const priority = move.priority ?? PRIORITY.NORMAL;

    return {
      id: move.id,
      productId: move.productId,
      productUomId: move.productUomId,
      quantity: move.quantity ?? 0,
      productUomQty: move.productUomQty ?? 0,
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      locationFinalId: move.locationFinalId,
      date: move.date,
      dateDeadline: move.dateDeadline,
      warehouseId: move.warehouseId,
      pickingTypeWarehouseId: move.pickingTypeId === null ? null : (typeById.get(move.pickingTypeId)?.warehouseId ?? null),
      routeIds: (routesOf.get(move.id) ?? []).map((link) => link.stockRouteId),
      resultPackageTypeRouteIds: [],
      packagingUomId: move.packagingUomId,
      isInventory: move.isInventory === true,
      originReturnedMoveDestId:
        move.originReturnedMoveId === null ? null : (linkedById.get(move.originReturnedMoveId)?.locationDestId ?? null),
      origin: move.origin,
      pickingName: picking?.name ?? null,
      companyId: move.companyId,
      personId: move.personId,
      partnerCustomerLocationId: partner === undefined ? null : (partner.propertyStockCustomerId ?? customersId),
      restrictPartnerId: move.restrictPartnerId,
      descriptionPickingManual: move.descriptionPickingManual,
      sequence: move.sequence,
      referenceIds: (referencesOf.get(move.id) ?? []).map((link) => link.referenceId),
      filterRecord: {
        productUomQty: move.productUomQty ?? 0,
        quantity: move.quantity ?? 0,
        origin: move.origin,
        priority,
        date: move.date,
        product: { name: variant?.name ?? null, defaultCode: variant?.defaultCode ?? null, barcode: variant?.barcode ?? null },
        category: category === undefined ? null : { name: category.name, completeName: category.completeName },
        picking:
          picking === undefined
            ? null
            : { name: picking.name, origin: picking.origin, priority: picking.priority, pickingTypeCode: picking.pickingTypeCode },
      },
      moveDests: (destinationsOf.get(move.id) ?? []).flatMap((link) => {
        const downstream = linkedById.get(link.moveDestId);

        return downstream === undefined || downstream.locationId === null
          ? []
          : [{ id: downstream.id, locationId: downstream.locationId, ruleId: downstream.ruleId }];
      }),
    };
  });
};

// The writes of a push, as the application.
export const graphqlPushStore: PushStore = {
  ...PROCUREMENT_WRITE_API,
  readRouting: readRoutingData,
  readDoneMoves,
  readLines: async (moveId) =>
    (
      await stockMoveLines.find<{
        id: string;
        locationDestId: string | null;
        quantityProductUom: number | null;
        lotId: string | null;
        resultPackageId: string | null;
        ownerId: string | null;
      }>({ moveId: { eq: moveId } }, 'id locationDestId quantityProductUom lotId resultPackageId ownerId')
    ).flatMap((line) =>
      line.locationDestId === null
        ? []
        : [
            {
              id: line.id,
              locationDestId: line.locationDestId,
              quantityProductUom: line.quantityProductUom ?? 0,
              lotId: line.lotId,
              resultPackageId: line.resultPackageId,
              ownerId: line.ownerId,
            },
          ],
    ),
  unlinkMoves: async (moveOrigId, moveDestIds) => {
    if (moveDestIds.length === 0) {
      return;
    }
    const rows = await stockMoveMoveRels.find<{ id: string }>(
      { and: [{ moveOrigId: { eq: moveOrigId } }, { moveDestId: { in: moveDestIds } }] },
      'id',
    );

    if (rows.length > 0) {
      await stockMoveMoveRels.destroyMany(rows.map((row) => row.id));
    }
  },
  makeToStock: (moveIds) => stockMoves.updateMany(moveIds, { procureMethod: PROCURE_METHOD.MAKE_TO_STOCK }),
  recomputeMove,
  setLineDestination: (lineId, locationDestId) => stockMoveLines.update(lineId, { locationDestId }),
  setMoveDestination: (moveId, values) => stockMoves.update(moveId, values),
  applyQuantDelta,
  settleQuantDelta,
  recomputeProductQuantities,
  recomputeTrackingForKeys,
  putawayDestinations,
};
