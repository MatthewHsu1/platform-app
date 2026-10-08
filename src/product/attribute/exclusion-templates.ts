import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';
import { exclusions, templateAttributeValues } from 'src/product/variant/product-records';

type ExclusionTemplates = {
  productTmplId: string | null;
  productTemplateAttributeValueId: string | null;
};

// The variants are reconciled again for the products an exclusion touches: the
// one it is about and the one its source value belongs to.
export const templatesOfExclusions = async (
  rows: ExclusionTemplates[],
  exclusionIds: string[] = [],
) => {
  const read =
    exclusionIds.length === 0
      ? []
      : await exclusions.findIncludingDeleted<ExclusionTemplates>(
          { id: { in: [...new Set(exclusionIds)] } },
          'productTmplId productTemplateAttributeValueId',
        );
  const all = [...rows, ...read];
  const sourceIds = [
    ...new Set(all.flatMap((row) => row.productTemplateAttributeValueId ?? [])),
  ];
  const sources =
    sourceIds.length === 0
      ? []
      : await templateAttributeValues.findIncludingDeleted<{ productTmplId: string | null }>(
          { id: { in: sourceIds } },
          'productTmplId',
        );

  return groupTemplateIds([...all, ...sources], (row) => row.productTmplId);
};
