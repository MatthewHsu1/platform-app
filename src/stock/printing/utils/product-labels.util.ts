import { pricelistPrice } from 'src/product/utils/pricelist-price.util';
import { type Pricelist } from 'src/product/utils/types/pricelist.type';
import { StockUserError } from 'src/stock/stock-errors';
import { type LabelProduct } from 'src/stock/printing/types/label-product.type';
import { type PrintOutput } from 'src/stock/printing/types/print-output.type';
import { type ProductLabelData } from 'src/stock/printing/types/product-label-data.type';
import { type ProductLabelOptions } from 'src/stock/printing/types/product-label-options.type';
import { checkLabelProducts, labelGrid, labelPrintOrder, labelQuantities } from 'src/stock/printing/utils/label-quantities.util';
import { productLabelSheet } from 'src/stock/printing/utils/label-sheets.util';
import { productDisplayName } from 'src/stock/printing/utils/product-display-name.util';
import { zplProductLabels } from 'src/stock/printing/utils/zpl.util';

const PRICE_DIGITS = 2;

// A variant's stored name is "[code] Template (values)": labels print it without the code, and the
// ZPL label prints the values on their own line.
export const variantLabelName = ({ name, defaultCode, templateName }: { name: string; defaultCode: string; templateName: string }) => {
  const codePrefix = defaultCode ? `[${defaultCode}] ` : '';
  const labelName = codePrefix && name.startsWith(codePrefix) ? name.slice(codePrefix.length) : name;
  const valuesPrefix = `${templateName} (`;
  const attributes =
    labelName.startsWith(valuesPrefix) && labelName.endsWith(')') ? labelName.slice(valuesPrefix.length, -1) : '';

  return { labelName, attributes };
};

const labelNames = (product: LabelProduct) =>
  product.isVariant
    ? variantLabelName({ name: product.name, defaultCode: product.defaultCode, templateName: product.templateName })
    : { labelName: product.name, attributes: '' };

// The price of one unit: the chosen pricelist's, or the sales price when none is chosen.
export const labelUnitPrice = ({
  product,
  pricelists,
  pricelistId,
  now,
}: {
  product: LabelProduct;
  pricelists: Map<string, Pricelist>;
  pricelistId: string | null;
  now: Date;
}) => {
  const pricelist = pricelistId === null ? undefined : pricelists.get(pricelistId);

  if (pricelistId === null || pricelist === undefined) {
    return { price: product.priced.listPrice + product.priced.priceExtra, currencyCode: product.priced.currencyCode };
  }
  try {
    const { price } = pricelistPrice({
      pricelists,
      pricelistId,
      product: product.priced,
      quantity: 1,
      uom: product.priced.uom,
      date: now.toISOString(),
      digits: PRICE_DIGITS,
    });

    return { price, currencyCode: pricelist.currencyCode };
  } catch (error) {
    throw new StockUserError(error instanceof Error ? error.message : String(error));
  }
};

export const formatLabelMoney = (amount: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(PRICE_DIGITS)} ${currencyCode}`;
  }
};

// The labels of a product label print: how many of each, in which order, on which sheet or as ZPL.
export const buildProductLabels = (data: ProductLabelData, options: ProductLabelOptions, now: Date): PrintOutput => {
  const format = options.format ?? 'PRICE_2X7';
  const grid = labelGrid(format);
  const fromTransfer = data.moves !== null;

  if (!fromTransfer) {
    checkLabelProducts(data.products);
  }
  const { quantityByProduct, customBarcodes } = labelQuantities({
    moveQuantity: fromTransfer ? (options.moveQuantity ?? 'MOVE') : 'CUSTOM',
    customQuantity: options.copies ?? 1,
    productIds: data.products.map((product) => product.id),
    moves: data.moves ?? [],
  });
  const byId = new Map(data.products.map((product) => [product.id, product]));
  const entries = labelPrintOrder({
    products: new Map(data.products.map((product) => [product.id, { sortName: product.templateName, barcode: product.barcode }])),
    quantityByProduct,
    customBarcodes,
    layout: grid.isZpl ? 'ZPL' : format === 'DYMO' ? 'DYMO' : 'SHEET',
  }).flatMap((entry) => {
    const product = byId.get(entry.productId);

    return product === undefined ? [] : [{ ...entry, product }];
  });
  const pricelists = new Map(data.pricelists.map((pricelist) => [pricelist.id, pricelist]));
  const priceOf = (product: LabelProduct) =>
    labelUnitPrice({ product, pricelists, pricelistId: options.pricelistId ?? null, now });

  if (grid.isZpl) {
    const template = options.zplTemplate ?? 'normal';
    const isWide = template === 'normal' || template === 'alternative';

    return {
      kind: 'zpl',
      text: zplProductLabels(
        entries.map(({ product, barcode, quantity }) => {
          const { attributes } = labelNames(product);
          const unitPrice = grid.priceIncluded ? priceOf(product) : null;
          const factor = product.priced.uom.factor;
          const perUnit = unitPrice !== null && factor !== 1 && product.referenceUnitName !== null;

          return {
            firstLine: isWide ? productDisplayName(product.isVariant ? product.templateName : product.name, product.defaultCode) : product.templateName,
            secondLine: isWide ? attributes : '',
            barcode,
            quantity,
            price: unitPrice === null ? null : formatLabelMoney(unitPrice.price, unitPrice.currencyCode),
            pricePerUnit: perUnit ? formatLabelMoney(unitPrice.price / factor, unitPrice.currencyCode) : null,
            referenceUnitName: perUnit ? product.referenceUnitName : null,
          };
        }),
        template,
      ),
    };
  }
  const showsPrice = grid.priceIncluded || format === 'DYMO';

  return productLabelSheet(
    entries.map(({ product, barcode, quantity }) => {
      const unitPrice = showsPrice ? priceOf(product) : null;

      return {
        name: labelNames(product).labelName,
        defaultCode: product.defaultCode,
        barcode,
        price: unitPrice === null ? null : formatLabelMoney(unitPrice.price, unitPrice.currencyCode),
        quantity,
      };
    }),
    format,
    format === 'PRICE_2X7' ? (options.extraContent ?? '') : '',
  );
};

// The download and page name of a product label print: the report's name for the format.
export const productLabelsFileName = (options: ProductLabelOptions) => {
  switch (options.format ?? 'PRICE_2X7') {
    case 'DYMO':
      return 'Product Label (PDF)';
    case 'PRICE_2X7':
      return 'Product Label 2x7 (PDF)';
    case 'PRICE_4X7':
      return 'Product Label 4x7 (PDF)';
    case 'PRICE_4X12':
      return 'Product Label 4x12 (PDF)';
    case 'PLAIN_4X12':
      return 'Product Label 4x12 No Price (PDF)';
    case 'ZPL':
    case 'ZPL_PRICE':
      return 'Product Label (ZPL)';
  }
};
