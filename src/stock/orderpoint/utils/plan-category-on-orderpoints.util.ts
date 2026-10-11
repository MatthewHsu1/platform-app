// Each rule holds the category of its variant's product; a rule whose product
// could not be read is left as it is.
export const planCategoryOnOrderpoints = ({
  templates,
  variants,
  rules,
}: {
  templates: { id: string; categId: string | null }[];
  variants: { id: string; productTmplId: string }[];
  rules: { id: string; productId: string; productCategoryId: string | null }[];
}) => {
  const categoryOf = new Map(templates.map((template) => [template.id, template.categId]));
  const templateOf = new Map(variants.map((variant) => [variant.id, variant.productTmplId]));

  return rules.flatMap((rule) => {
    const templateId = templateOf.get(rule.productId);
    const categoryId = templateId === undefined ? undefined : categoryOf.get(templateId);

    return categoryId === undefined || categoryId === rule.productCategoryId ? [] : [{ id: rule.id, productCategoryId: categoryId }];
  });
};
