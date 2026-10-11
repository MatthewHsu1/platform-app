import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';
import { type RelocateQuant } from 'src/stock/utils/types/relocate-quant.type';

export const RELOCATE_POSITIVE_ONLY_MESSAGE =
  'You can only move positive quantities stored in locations used by a single company per relocation.';

export const RELOCATED_DEFAULT_REASON = 'Quantity Relocated';

export const relocateRefusal = (quants: { quantity: number }[]) =>
  quants.some((quant) => quant.quantity <= 0) ? RELOCATE_POSITIVE_ONLY_MESSAGE : null;

// Each quant leaves whole, as one adjustment move; with no destination it
// stays where it is (unpacking moves only the package side). A packed quant
// stays in its package unless it is unpacked.
export const planMoveQuants = ({
  quants,
  destinationId,
  reason,
  newId,
  unpack = false,
}: {
  quants: RelocateQuant[];
  destinationId: string | null;
  reason: string | null;
  newId: () => string;
  unpack?: boolean;
}): InventoryMovePlan[] =>
  quants.map((quant) => ({
    quantId: quant.id,
    moveId: newId(),
    lineId: newId(),
    productId: quant.productId,
    productUomId: quant.productUomId,
    quantity: quant.quantity,
    quantityProductUom: quant.quantity,
    locationId: quant.locationId,
    locationDestId: destinationId ?? quant.locationId,
    ...(quant.lotId === null ? {} : { lotId: quant.lotId }),
    ...(quant.packageId === null ? {} : { packageId: quant.packageId }),
    ...(quant.packageId === null || unpack ? {} : { resultPackageId: quant.packageId }),
    ownerId: quant.ownerId,
    inventoryName: reason !== null && reason.trim().length > 0 ? reason : RELOCATED_DEFAULT_REASON,
  }));

// The selected rows that leave their package: those of a package that keeps
// other rows with stock or a reservation.
export const partialPackageRowIds = (quants: RelocateQuant[], packageContentIds: Map<string, string[]>) => {
  const selected = new Set(quants.map((quant) => quant.id));

  return new Set(
    quants
      .filter((quant) => quant.packageId !== null && (packageContentIds.get(quant.packageId) ?? []).some((id) => !selected.has(id)))
      .map((quant) => quant.id),
  );
};

// A wholly selected package moves along; rows taken from a package that keeps
// other stock leave it, and are moved first.
export const planRelocateMoves = ({
  packageContentIds = new Map(),
  ...input
}: {
  quants: RelocateQuant[];
  destinationId: string | null;
  reason: string | null;
  newId: () => string;
  // Per package of the rows: its rows with stock or a reservation.
  packageContentIds?: Map<string, string[]>;
}): { kind: 'refuse'; message: string } | { kind: 'nothing' } | { kind: 'moves'; moves: InventoryMovePlan[] } => {
  const refusal = relocateRefusal(input.quants);

  if (refusal !== null) {
    return { kind: 'refuse', message: refusal };
  }
  if (input.destinationId === null) {
    return { kind: 'nothing' };
  }
  const leaving = partialPackageRowIds(input.quants, packageContentIds);

  return {
    kind: 'moves',
    moves: [
      ...planMoveQuants({ ...input, quants: input.quants.filter((quant) => leaving.has(quant.id)), unpack: true }),
      ...planMoveQuants({ ...input, quants: input.quants.filter((quant) => !leaving.has(quant.id)) }),
    ],
  };
};
