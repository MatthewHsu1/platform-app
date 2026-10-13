import { records } from 'src/shared/triggers/records';

const packagingLinks = records('productTemplateUomUomRel', 'productTemplateUomUomRels');
const vendorPrices = records('productSupplierinfo', 'productSupplierinfos');

// The units a scrap or a replenishment of a product may use: its own (first), its packagings, and the units of its
// vendor prices. Keyed by product template.
export const readAllowedUnits = async (ownUnitByTemplate: Map<string, string>) => {
  const templateIds = [...ownUnitByTemplate.keys()];
  const units = new Map<string, Set<string>>(
    [...ownUnitByTemplate].map(([templateId, uomId]) => [templateId, new Set([uomId])]),
  );

  if (templateIds.length === 0) {
    return units;
  }
  const [links, sellers] = await Promise.all([
    packagingLinks.find<{ productTemplateId: string; uomUomId: string }>(
      { productTemplateId: { in: templateIds } },
      'productTemplateId uomUomId',
    ),
    vendorPrices.find<{ productTmplId: string | null; productUomId: string | null }>(
      { productTmplId: { in: templateIds } },
      'productTmplId productUomId',
    ),
  ]);

  for (const link of links) {
    units.get(link.productTemplateId)?.add(link.uomUomId);
  }
  for (const seller of sellers) {
    if (seller.productTmplId !== null && seller.productUomId !== null) {
      units.get(seller.productTmplId)?.add(seller.productUomId);
    }
  }

  return units;
};
