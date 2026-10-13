import { PRODUCT_TYPE } from 'src/product/product-options.constant';

export const PRODUCT_UOM_CHANGE_REASON =
  'As other units of measure (ex : {problemUom}) than {uom} have already been used for this product, the change of unit of measure can not be done. If you want to change it, please archive the product and create a new one.';
export const UOM_RATIO_CHANGE_REASON =
  'You cannot change the ratio of this unit of measure as some products with this UoM have already been moved or are currently reserved.';

type UomUse = { id: string; productUomId: string | null };
type Ratio = { relativeFactor: number; relativeUomId: string | null };

export const planStorableFlag = ({ productType, isStorable }: { productType: string; isStorable: boolean }) =>
  productType !== PRODUCT_TYPE.CONSU && isStorable ? { isStorable: false } : null;

// Moves and lines keep their quantities; they only take the new unit. A move or line in another unit than the old
// product unit blocks the change.
export const planProductUomChange = ({
  oldUomId,
  moves,
  lines,
}: {
  oldUomId: string;
  newUomId: string;
  moves: UomUse[];
  lines: UomUse[];
}) => {
  const problem = [...moves, ...lines].find((use) => use.productUomId !== null && use.productUomId !== oldUomId);

  if (problem !== undefined) {
    return { kind: 'refuse', problemUomId: problem.productUomId as string } as const;
  }

  return { kind: 'rewrite', moveIds: moves.map((move) => move.id), lineIds: lines.map((line) => line.id) } as const;
};

// Returns the values to put back, or null.
export const planUomRatioChange = ({
  before,
  after,
  openMoves,
  openLines,
  heldQuants,
}: {
  before: Ratio;
  after: Ratio;
  openMoves: number;
  openLines: number;
  heldQuants: number;
}): Ratio | null => {
  const changed = before.relativeFactor !== after.relativeFactor || before.relativeUomId !== after.relativeUomId;

  return changed && openMoves + openLines + heldQuants > 0
    ? { relativeFactor: before.relativeFactor, relativeUomId: before.relativeUomId }
    : null;
};
