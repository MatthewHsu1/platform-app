import { floatRound, type RoundingMethod } from 'src/shared/utils/float-round.util';
import { resolveTree } from 'src/shared/utils/resolve-tree.util';

export type UomRow = {
  id: string;
  name: string;
  relativeUomId: string | null;
  relativeFactor: number;
  seedKey: string | null;
};

export type ResolvedUom = { id: string; name: string; factor: number; rootId: string; parentPath: string };

const UNPROTECTED_SEED_KEYS = new Set([
  'uom.product_uom_hour',
  'uom.product_uom_dozen',
  'uom.product_uom_pack_6',
]);

export const isProtectedSeedUnit = (seedKey: string | null) =>
  seedKey !== null && seedKey.startsWith('uom.') && !UNPROTECTED_SEED_KEYS.has(seedKey);

// The default-unit check applies to every unit asked to be deleted, but the
// cascade over reference units skips it. The cascade trashes a
// unit only after its reference unit is in the trash, in an earlier batch; a
// reference unit in the same batch means both were picked in one delete.
export const keepsSeedUnitOnDelete = ({
  seedKey,
  relativeUomId,
  batchIds,
  deletedUnitIds,
}: {
  seedKey: string | null;
  relativeUomId: string | null;
  batchIds: Set<string>;
  deletedUnitIds: Set<string>;
}) =>
  isProtectedSeedUnit(seedKey) &&
  !(relativeUomId !== null && deletedUnitIds.has(relativeUomId) && !batchIds.has(relativeUomId));

export const resolveUoms = (rows: UomRow[]) => {
  const { chains, cycles } = resolveTree(rows.map((row) => ({ ...row, parentId: row.relativeUomId })));
  const resolved = new Map<string, ResolvedUom>();

  for (const [id, chain] of chains) {
    const self = chain[chain.length - 1];
    resolved.set(id, {
      id,
      name: self.name,
      factor: chain.reduce((factor, link) => factor * link.relativeFactor, 1),
      rootId: chain[0].id,
      parentPath: `${chain.map((link) => link.id).join('/')}/`,
    });
  }

  return { resolved, cycles };
};

const assertSameTree = (from: ResolvedUom, to: ResolvedUom) => {
  if (from.rootId !== to.rootId) {
    throw new Error(`Cannot convert ${from.name} to ${to.name}: they do not share a reference unit.`);
  }
};

export const computeQuantity = ({
  qty,
  from,
  to,
  digits,
  round = true,
  method = 'UP',
}: {
  qty: number;
  from: ResolvedUom;
  to: ResolvedUom;
  digits: number;
  round?: boolean;
  method?: RoundingMethod;
}) => {
  if (qty === 0) {
    return qty;
  }
  assertSameTree(from, to);
  const amount = from.id === to.id ? qty : (qty * from.factor) / to.factor;

  return round ? floatRound(amount, 10 ** -digits, method) : amount;
};

export const computePrice = ({ price, from, to }: { price: number; from: ResolvedUom; to: ResolvedUom }) => {
  if (price === 0 || from.id === to.id) {
    return price;
  }
  assertSameTree(from, to);

  return (price * to.factor) / from.factor;
};

export const checkQty = ({
  qty,
  productUom,
  packagingUom,
  digits,
  method = 'HALF-UP',
}: {
  qty: number;
  productUom: ResolvedUom;
  packagingUom: ResolvedUom;
  digits: number;
  method?: RoundingMethod;
}) => {
  const packagingQty = computeQuantity({ qty: 1, from: packagingUom, to: productUom, digits });

  return floatRound(floatRound(qty / packagingQty, 1, method) * packagingQty, 10 ** -digits, 'HALF-UP');
};

export const planUomUpdate = ({
  row,
  resolved,
}: {
  row: { id: string; factor: number | null; parentPath: string | null; sequence: number | null; relativeFactor: number };
  resolved: ResolvedUom;
}) => {
  const data: Record<string, unknown> = {};

  if (row.factor !== resolved.factor) {
    data.factor = resolved.factor;
  }
  if (row.parentPath !== resolved.parentPath) {
    data.parentPath = resolved.parentPath;
  }
  if (row.sequence === null) {
    data.sequence = Math.min(Math.trunc(row.relativeFactor * 100), 1000);
  }

  return data;
};

type UomParentState = { relativeUomId: string | null; relativeFactor: number };

// A unit with no reference unit must contain exactly 1. The save is
// refused as a whole, so a unit that lost its parent gets the parent and factor back.
export const planRootFactorPutBack = ({
  before,
  after,
}: {
  before?: UomParentState;
  after: UomParentState;
}): Record<string, unknown> | null => {
  if (after.relativeUomId !== null || after.relativeFactor === 1) {
    return null;
  }
  if (before?.relativeUomId != null) {
    return { relativeUomId: before.relativeUomId, relativeFactor: before.relativeFactor };
  }

  return { relativeFactor: 1 };
};

// The units based on a deleted unit, and theirs, are deleted with it.
export const unitsReachedByDelete = ({
  unitId,
  units,
}: {
  unitId: string;
  units: { id: string; relativeUomId: string | null }[];
}) => {
  const reached = new Set([unitId]);
  let frontier = new Set([unitId]);

  while (frontier.size > 0) {
    const next = units
      .filter((unit) => unit.relativeUomId !== null && frontier.has(unit.relativeUomId) && !reached.has(unit.id))
      .map((unit) => unit.id);

    next.forEach((id) => reached.add(id));
    frontier = new Set(next);
  }
  return [...reached];
};

// A product's unit and a vendor price's unit are required and restrict deletion,
// so the whole delete, cascade included, is refused while a
// product (archived too) or a vendor price uses one of the units it reaches.
export const unitDeleteRefusal = ({
  reachedUnitIds,
  usedUnitIds,
}: {
  reachedUnitIds: string[];
  usedUnitIds: string[];
}): string | null => {
  const used = new Set(usedUnitIds);

  return reachedUnitIds.some((id) => used.has(id))
    ? 'Products or vendor prices use this unit, or a unit based on it. Archive it (untick Active) instead of deleting it.'
    : null;
};
