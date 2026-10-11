import { isRoutingLocationUnder } from 'src/stock/utils/procurement/location-chain.util';
import { type MoveRef } from 'src/stock/utils/procurement/types/move-ref.type';
import { type PartnerRef } from 'src/stock/utils/procurement/types/partner-ref.type';
import { type PartnerUpdate } from 'src/stock/utils/procurement/types/partner-update.type';
import { type PlannedMove } from 'src/stock/utils/procurement/types/planned-move.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

const DAY_MS = 86_400_000;

export const shiftDays = (isoDate: string, days: number) => new Date(Date.parse(isoDate) + days * DAY_MS).toISOString();

// Where a new move lands: the rule's destination when the rule gives it, else
// the operation type's default destination; the final location instead when
// it lies under that one. No destination when neither is set.
export const effectiveDestination = (
  move: Pick<PlannedMove, 'locationDestId' | 'locationFinalId' | 'pickingTypeId'>,
  data: RoutingData,
  context: ProcurementContext,
) => {
  const destination = move.locationDestId ?? context.pickingTypes.get(move.pickingTypeId)?.defaultLocationDestId ?? null;

  if (destination === null) {
    return null;
  }

  return isRoutingLocationUnder(data.locations.get(move.locationFinalId), data.locations.get(destination))
    ? move.locationFinalId
    : destination;
};

const destinationOf = (ref: MoveRef, planned: PlannedMove[], data: RoutingData, context: ProcurementContext) => {
  if (ref.kind === 'existing') {
    return context.existingMoveDestinations.get(ref.id) ?? null;
  }
  const move = planned.find((candidate) => candidate.key === ref.key);

  return move === undefined ? null : effectiveDestination(move, data, context);
};

const hasPartner = (partner: PartnerRef | null | undefined): partner is PartnerRef =>
  partner != null && (partner.companyId !== null || partner.personId !== null);

type PullMovePlan = { move: PlannedMove; partnerUpdates: PartnerUpdate[] };

// Into the transit location with downstream moves, the moves name the
// warehouses as partners: the new move the downstream warehouse's partner when
// there is one, the downstream moves the supplying warehouse's partner.
export const planPullMove = (
  { procurement, rule, key, planned }: { procurement: Procurement; rule: RoutingRule & { locationSrcId: string }; key: string; planned: PlannedMove[] },
  data: RoutingData,
  context: ProcurementContext,
): PullMovePlan => {
  const { values } = procurement;
  const moveDests = values.moveDests ?? [];
  let partner: PartnerRef | null =
    rule.partnerAddressId !== null || rule.partnerAddressPersonId !== null
      ? { companyId: rule.partnerAddressId, personId: rule.partnerAddressPersonId }
      : hasPartner(values.partner)
        ? values.partner
        : null;
  const partnerUpdates: PartnerUpdate[] = [];

  if (moveDests.length > 0 && procurement.locationId === context.internalTransitLocationId) {
    if (partner === null) {
      const downstreamPartners = [
        ...new Set(
          moveDests.flatMap((ref) => {
            const destinationId = destinationOf(ref, planned, data, context);
            const warehouseId = destinationId === null ? null : (data.locations.get(destinationId)?.warehouseId ?? null);
            const partnerId = warehouseId === null ? null : (context.warehousePartnerIds.get(warehouseId) ?? null);

            return partnerId === null ? [] : [partnerId];
          }),
        ),
      ];
      if (downstreamPartners.length === 1) {
        partner = { companyId: downstreamPartners[0], personId: null };
      }
    }
    const supplyingWarehouseId = data.locations.get(rule.locationSrcId)?.warehouseId ?? null;
    const supplyingPartnerId = supplyingWarehouseId === null ? null : (context.warehousePartnerIds.get(supplyingWarehouseId) ?? null);

    if (supplyingPartnerId !== null) {
      partnerUpdates.push(...moveDests.map((ref) => ({ move: ref, companyId: supplyingPartnerId })));
    }
  }

  const datePlanned = values.datePlanned ?? context.now;

  return {
    move: {
      key,
      productId: procurement.productId,
      productUomId: procurement.productUomId,
      productUomQty: procurement.productQty,
      date: shiftDays(datePlanned, -rule.delay),
      dateDeadline: values.dateDeadline ? shiftDays(values.dateDeadline, -rule.delay) : null,
      locationId: rule.locationSrcId,
      locationFinalId: procurement.locationId,
      locationDestId: rule.locationDestFromRule ? rule.locationDestId : null,
      ruleId: rule.id,
      pickingTypeId: rule.pickingTypeId,
      warehouseId: rule.warehouseId,
      propagateCancel: rule.propagateCancel,
      procureMethod: rule.procureMethod === 'MAKE_TO_ORDER' ? 'MAKE_TO_ORDER' : 'MAKE_TO_STOCK',
      companyId: partner?.companyId ?? null,
      personId: partner?.personId ?? null,
      moveDests,
      referenceIds: values.referenceIds ?? [],
      routeIds: values.routeIds ?? [],
      priority: values.priority ?? 'NORMAL',
      orderpointId: values.orderpointId ?? null,
      origin: procurement.origin,
      toRefund: procurement.productQty < 0,
      procurementRun: context.runId,
    },
    partnerUpdates,
  };
};
