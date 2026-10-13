import { productComboItems, productComboLinks } from 'src/product/combo/combo-records';
import { saleComboRefusal } from 'src/product/utils/combo-guards.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';

// The sale check for one product, read from what is stored now.
export const comboSaleRefusal = async (templateId: string) => {
  const [template] = await productTemplates.find<{ productType: string | null; saleOk: boolean }>(
    { id: { eq: templateId } },
    'productType saleOk',
  );

  if (template === undefined || template.productType !== 'COMBO' || !template.saleOk) {
    return null;
  }
  const links = await productComboLinks.find<{ productComboId: string | null }>(
    { productTemplateId: { eq: templateId } },
    'productComboId',
  );
  const comboIds = links.flatMap((link) => link.productComboId ?? []);
  const items =
    comboIds.length === 0
      ? []
      : await productComboItems.find<{ productId: string | null }>({ comboId: { in: comboIds } }, 'productId');
  const variantIds = items.flatMap((item) => item.productId ?? []);
  const variants =
    variantIds.length === 0
      ? []
      : await productProducts.find<{ productTmplId: string | null }>({ id: { in: variantIds } }, 'productTmplId');
  const templateIds = variants.flatMap((variant) => variant.productTmplId ?? []);
  const sellable =
    templateIds.length === 0
      ? []
      : await productTemplates.find<{ saleOk: boolean }>({ id: { in: templateIds } }, 'id saleOk');

  return saleComboRefusal({
    productType: template.productType,
    saleOk: template.saleOk,
    itemSaleOk: sellable.map((product) => product.saleOk),
  });
};
