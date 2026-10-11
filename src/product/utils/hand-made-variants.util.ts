import { type VariantPlan } from 'src/product/utils/types/variant-plan.type';


// Every variant is one combination of its product's values, at most one
// per combination (unique product + combination). A variant made by
// hand that the plan would remove repeats a combination or has none, so its create
// is refused.
export const refusedHandMadeVariants = ({
  plan,
  handMadeIds,
}: {
  plan: VariantPlan;
  handMadeIds: string[];
}) => (plan.kind === 'apply' ? handMadeIds.filter((id) => plan.removeOrArchive.includes(id)) : []);
