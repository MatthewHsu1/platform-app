import { findBarcodeClash } from 'src/product/utils/guards.util';
import { packagingBarcodes, productProducts, productTemplates } from 'src/product/variant/product-records';
import { findMany } from 'src/shared/triggers/records';
import { putBack } from 'src/shared/triggers/put-back';

type BarcodeOwner = 'productProduct' | 'productUom' | 'productTemplate';

const OWNER_RECORDS = {
  productProduct: { objectSingular: 'productProduct', objectPlural: 'productProducts' },
  productUom: { objectSingular: 'productUom', objectPlural: 'productUoms' },
  productTemplate: { objectSingular: 'productTemplate', objectPlural: 'productTemplates' },
} as const;

// A barcode must be unique; Twenty has saved already,
// so the old barcode goes back. Returns true when it did. A row whose stored
// barcode is no longer the saved one was changed again meanwhile: left alone.
export const putBackBarcodeClash = async ({
  owner,
  recordId,
  savedBarcode,
  previousBarcode,
}: {
  owner: BarcodeOwner;
  recordId: string;
  savedBarcode: string | null;
  previousBarcode: string | null;
}) => {
  if (savedBarcode === null || savedBarcode === '') {
    return false;
  }
  const found = await findMany<{
    variants: { id: string; barcode: string | null; active: boolean; productTmplId: string | null }[];
    packagings: { id: string; barcode: string }[];
  }>({
    variants: {
      of: productProducts,
      filter: { barcode: { eq: savedBarcode } },
      selection: 'id barcode active productTmplId',
    },
    packagings: { of: packagingBarcodes, filter: { barcode: { eq: savedBarcode } }, selection: 'id barcode' },
  });
  const owners =
    owner === 'productTemplate'
      ? await productTemplates.find<{ id: string; barcode: string | null }>(
          { id: { eq: recordId } },
          'id barcode',
        )
      : owner === 'productProduct'
        ? found.variants
        : found.packagings;
  const stored = owners.find((row) => row.id === recordId);

  if (stored === undefined || stored.barcode !== savedBarcode) {
    return false;
  }
  if (
    findBarcodeClash({
      barcode: savedBarcode,
      selfId: recordId,
      ownVariantIds:
        owner === 'productTemplate'
          ? found.variants.filter((variant) => variant.productTmplId === recordId).map((variant) => variant.id)
          : [],
      variants: found.variants,
      packagings: found.packagings,
    }) === null
  ) {
    return false;
  }
  await putBack({
    ...OWNER_RECORDS[owner],
    recordId,
    data: { barcode: previousBarcode },
    reason: `Barcode ${savedBarcode} is already used by another product variant (or packaging).`,
  });
  return true;
};
