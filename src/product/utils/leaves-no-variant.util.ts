import { type VariantPlan } from 'src/product/utils/types/variant-plan.type';


// Deleting the last variant deletes the product and then fails with "no possible
// variant", which undoes the whole save. A variant that
// is only archived keeps the product, and so does one made or brought back.
export const leavesNoVariant = ({
  variants,
  plan,
  variantsInUse,
  hasDynamic,
}: {
  variants: { id: string; deletedAt: string | null }[];
  plan: Extract<VariantPlan, { kind: 'apply' }>;
  variantsInUse: Set<string>;
  hasDynamic: boolean;
}) => {
  if (hasDynamic || plan.create.length > 0 || plan.activate.length > 0) {
    return false;
  }
  const removed = new Set(plan.removeOrArchive);

  return variants.every(
    (variant) =>
      variant.deletedAt !== null || (removed.has(variant.id) && !variantsInUse.has(variant.id)),
  );
};

// Which note the product gets once the refused change is undone. Nothing
// reached although there was a change to undo means another run for the same
// save undid it, or will, and writes the note.
export const noVariantLeftNote = ({ attempted, undone }: { attempted: number; undone: number }) =>
  undone > 0 ? 'undone' : attempted === 0 ? 'kept' : null;
