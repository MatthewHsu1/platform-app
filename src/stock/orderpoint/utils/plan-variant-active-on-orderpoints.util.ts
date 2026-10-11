// A variant's archived flag goes to each of its rules that differs, archived
// rules included, so unarchiving a variant brings all its rules back.
export const planVariantActiveOnOrderpoints = ({
  variants,
  rules,
}: {
  variants: { id: string; active: boolean | null }[];
  rules: { id: string; productId: string; active: boolean | null }[];
}) => {
  const activeOf = new Map(variants.map((variant) => [variant.id, variant.active === true]));

  return rules.flatMap((rule) => {
    const active = activeOf.get(rule.productId);

    return active === undefined || active === (rule.active === true) ? [] : [{ id: rule.id, active }];
  });
};
