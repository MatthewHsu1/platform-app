import { productPricelistItems, productPricelists } from 'src/product/pricelist/pricelist-records';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import { type AppliedOn } from 'src/product/types/applied-on.type';
import { type ComputePrice } from 'src/product/types/compute-price.type';
import { type PricelistBase } from 'src/product/types/pricelist-base.type';
import { type Pricelist } from 'src/product/utils/types/pricelist.type';
import { type PricelistRule } from 'src/product/utils/types/pricelist-rule.type';
import { type Records } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { findIn } from 'src/stock/printing/print-rows';
import { type LabelMove } from 'src/stock/printing/types/label-move.type';
import { type LabelProduct } from 'src/stock/printing/types/label-product.type';
import { type LotLabelRow } from 'src/stock/printing/types/lot-label-row.type';
import { type ProductLabelData } from 'src/stock/printing/types/product-label-data.type';
import { orderMoveLines } from 'src/stock/printing/utils/picking-print-data.util';
import { stockMoveLines, stockMoves, uomUoms } from 'src/stock/stock-records';
import { type RowFinder } from 'src/stock/types/row-finder.type';
import { UOM_SEED_KEY_UNIT } from 'src/uom/uom-universal-identifiers.constant';
import { resolveUoms } from 'src/uom/utils/uom.util';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

// Everything here reads as the application: the print page has no person. The ids it starts from
// were checked as the person when the print link was made.

type Money = { amountMicros: number | null; currencyCode: string | null } | null;
type TemplateRow = {
  id: string;
  name: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  productType: string | null;
  uomId: string | null;
  listPrice: Money;
  standardPrice: Money;
  categ: { parentPath: string | null } | null;
};
type VariantRow = {
  id: string;
  name: string | null;
  active: boolean;
  defaultCode: string | null;
  barcode: string | null;
  productTmplId: string | null;
  priceExtra: Money;
  standardPrice: Money;
};
type MoveRow = {
  id: string;
  productId: string | null;
  productUomQty: number | null;
  quantity: number | null;
  sequence: number | null;
  createdAt: string;
};
type LineRow = {
  id: string;
  moveId: string | null;
  productId: string | null;
  productUomId: string | null;
  quantity: number | null;
  lotId: string | null;
  lotName: string | null;
  lot: { name: string | null } | null;
  resultPackage: { name: string | null } | null;
  createdAt: string;
};
type LotRow = {
  id: string;
  name: string | null;
  product: { name: string | null; defaultCode: string | null; productTmplId: string | null } | null;
};
type ItemRow = {
  id: string;
  createdAt: string;
  pricelistId: string | null;
  appliedOn: string | null;
  categ: { parentPath: string | null; completeName: string | null } | null;
  productTmplId: string | null;
  productId: string | null;
  minQuantity: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  base: string | null;
  basePricelistId: string | null;
  computePrice: string | null;
  fixedPrice: Money;
  percentPrice: number | null;
  priceDiscount: number | null;
  priceMarkup: number | null;
  priceRound: Money;
  priceSurcharge: Money;
  priceMinMargin: Money;
  priceMaxMargin: Money;
};

const ID_CHUNK = 200;
const CURRENCY = 'amountMicros currencyCode';
const TEMPLATE_SELECTION = `id name active defaultCode barcode productType uomId listPrice { ${CURRENCY} } standardPrice { ${CURRENCY} } categ { deletedAt parentPath }`;
const VARIANT_SELECTION = `id name active defaultCode barcode productTmplId priceExtra { ${CURRENCY} } standardPrice { ${CURRENCY} }`;
const ITEM_SELECTION = `id createdAt pricelistId appliedOn categ { deletedAt parentPath completeName } productTmplId productId minQuantity
  dateStart dateEnd base basePricelistId computePrice fixedPrice { ${CURRENCY} } percentPrice priceDiscount priceMarkup
  priceRound { ${CURRENCY} } priceSurcharge { ${CURRENCY} } priceMinMargin { ${CURRENCY} } priceMaxMargin { ${CURRENCY} }`;

const LINE_SELECTION =
  'id moveId productId productUomId quantity lotId lotName lot { id deletedAt name } resultPackage { id deletedAt name } createdAt';

const money = (value: Money) => (value?.amountMicros ?? 0) / 1_000_000;
const text = (value: string | null | undefined) => value ?? '';

const findByIds = async <TRow extends { id: string }>(of: Records, ids: string[], selection: string, filter: Record<string, unknown> = {}) => {
  const rows: TRow[] = [];

  for (const part of chunks([...new Set(ids)], ID_CHUNK)) {
    rows.push(...(await of.find<TRow>({ ...filter, id: { in: part } }, selection)));
  }

  return rows;
};

// In the order asked for; an id with no row is skipped.
const inOrder = <TRow extends { id: string }>(rows: TRow[], ids: string[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]));

  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? []);
};

const readUnits = async () => {
  const rows = await uomUoms.find<{ id: string; name: string | null; relativeUomId: string | null; relativeFactor: number; seedKey: string | null }>(
    {},
    'id name relativeUomId relativeFactor seedKey',
  );
  const { resolved } = resolveUoms(rows);
  const relativeOf = new Map(rows.map((row) => [row.id, row.relativeUomId]));
  const unitRow = rows.find((row) => row.seedKey === UOM_SEED_KEY_UNIT);

  return {
    resolved,
    referenceUnitName: (uomId: string) => {
      const relativeId = relativeOf.get(uomId) ?? null;

      return relativeId === null ? null : (resolved.get(relativeId)?.name ?? null);
    },
    // A unit counts label by label when it shares its reference unit with Units.
    isUnitLike: (uomId: string | null) => {
      const units = unitRow === undefined ? undefined : resolved.get(unitRow.id);

      return uomId !== null && units !== undefined && resolved.get(uomId)?.rootId === units.rootId;
    },
  };
};

const FALLBACK_UOM: ResolvedUom = { id: '', name: '', factor: 1, rootId: '', parentPath: '' };

const toLabelProduct = (
  template: TemplateRow,
  variant: VariantRow | null,
  templateVariantIds: string[],
  units: Awaited<ReturnType<typeof readUnits>>,
): LabelProduct => {
  const uom = (template.uomId === null ? undefined : units.resolved.get(template.uomId)) ?? FALLBACK_UOM;

  return {
    id: variant?.id ?? template.id,
    isVariant: variant !== null,
    templateName: text(template.name),
    name: text(variant === null ? template.name : variant.name),
    defaultCode: text(variant === null ? template.defaultCode : variant.defaultCode),
    barcode: text(variant === null ? template.barcode : variant.barcode),
    isService: template.productType === PRODUCT_TYPE.SERVICE,
    priced: {
      templateId: template.id,
      variantId: variant?.id ?? null,
      templateVariantIds,
      categPath: template.categ?.parentPath ?? null,
      uom,
      currencyCode: template.listPrice?.currencyCode ?? 'USD',
      listPrice: money(template.listPrice),
      priceExtra: variant === null ? 0 : money(variant.priceExtra),
      standardPrice: money(variant === null ? template.standardPrice : variant.standardPrice),
    },
    referenceUnitName: template.uomId === null ? null : units.referenceUnitName(template.uomId),
  };
};

const activeVariantIdsByTemplate = async (templateIds: string[]) => {
  const byTemplate = new Map<string, string[]>();

  for (const part of chunks([...new Set(templateIds)], ID_CHUNK)) {
    const rows = await productProducts.find<{ id: string; productTmplId: string | null }>(
      { productTmplId: { in: part }, active: { eq: true } },
      'id productTmplId',
    );

    rows.forEach((row) => {
      if (row.productTmplId !== null) {
        byTemplate.set(row.productTmplId, [...(byTemplate.get(row.productTmplId) ?? []), row.id]);
      }
    });
  }

  return byTemplate;
};

// Archived products are not labelled.
const readTemplateProducts = async (templateIds: string[], units: Awaited<ReturnType<typeof readUnits>>) => {
  const templates = inOrder(await findByIds<TemplateRow>(productTemplates, templateIds, TEMPLATE_SELECTION, { active: { eq: true } }), templateIds);
  const variantIds = await activeVariantIdsByTemplate(templates.map((template) => template.id));

  return templates.map((template) => toLabelProduct(template, null, variantIds.get(template.id) ?? [], units));
};

const readVariantProducts = async (variantIds: string[], units: Awaited<ReturnType<typeof readUnits>>) => {
  const variants = inOrder(await findByIds<VariantRow>(productProducts, variantIds, VARIANT_SELECTION, { active: { eq: true } }), variantIds);
  const templateIds = variants.flatMap((variant) => variant.productTmplId ?? []);
  const templates = new Map(
    (await findByIds<TemplateRow>(productTemplates, templateIds, TEMPLATE_SELECTION)).map((template) => [template.id, template]),
  );
  const variantIdsOf = await activeVariantIdsByTemplate(templateIds);

  return variants.flatMap((variant) => {
    const template = variant.productTmplId === null ? undefined : templates.get(variant.productTmplId);

    return template === undefined ? [] : [toLabelProduct(template, variant, variantIdsOf.get(template.id) ?? [], units)];
  });
};

const bySequence = (left: MoveRow, right: MoveRow) =>
  (left.sequence ?? 0) - (right.sequence ?? 0) || (left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : 0);

// The moves of the transfers in their order, each with its lines in theirs.
const readTransferMoves = async (find: RowFinder, pickingIds: string[]) => {
  const moves: MoveRow[] = [];
  const lines: LineRow[] = [];

  for (const part of chunks([...new Set(pickingIds)], ID_CHUNK)) {
    moves.push(
      ...(await findIn<MoveRow>(find, stockMoves, { pickingId: { in: part } }, 'id productId productUomQty quantity sequence createdAt')),
    );
    lines.push(
      ...(await findIn<LineRow>(find, stockMoveLines, { pickingId: { in: part } }, LINE_SELECTION)),
    );
  }
  const linesOf = new Map<string, LineRow[]>();

  lines.forEach((line) => {
    if (line.moveId !== null) {
      linesOf.set(line.moveId, [...(linesOf.get(line.moveId) ?? []), line]);
    }
  });

  return [...moves].sort(bySequence).map((move) => ({
    move,
    lines: orderMoveLines((linesOf.get(move.id) ?? []).map((line) => ({ ...line, resultPackageName: text(line.resultPackage?.name) }))),
  }));
};

// The chosen pricelist and every pricelist its rules build on. Each id is asked for once, so rules
// that point back at a pricelist, or at one that is gone, cannot loop.
const readPricelists = async (pricelistId: string | null) => {
  const pricelists = new Map<string, Pricelist>();
  const asked = new Set<string>();
  let wanted = pricelistId === null ? [] : [pricelistId];

  while (wanted.length > 0) {
    wanted.forEach((id) => asked.add(id));
    const rows = await findByIds<{ id: string; name: string | null; currencyCode: string | null }>(
      productPricelists,
      wanted,
      'id name currencyCode',
    );
    const items = (
      await Promise.all(chunks(wanted, ID_CHUNK).map((part) => productPricelistItems.find<ItemRow>({ pricelistId: { in: part } }, ITEM_SELECTION)))
    ).flat();

    rows.forEach((row) =>
      pricelists.set(row.id, {
        id: row.id,
        name: text(row.name),
        currencyCode: row.currencyCode ?? 'USD',
        rules: items.filter((item) => item.pricelistId === row.id).map(toRule),
      }),
    );
    wanted = [...new Set(items.flatMap((item) => item.basePricelistId ?? []))].filter((id) => !asked.has(id));
  }

  return [...pricelists.values()];
};

const toRule = (item: ItemRow): PricelistRule => ({
  id: item.id,
  createdAt: item.createdAt,
  appliedOn: (item.appliedOn ?? 'GLOBAL') as AppliedOn,
  categPath: item.categ?.parentPath ?? null,
  categCompleteName: item.categ?.completeName ?? null,
  productTmplId: item.productTmplId,
  productId: item.productId,
  minQuantity: item.minQuantity ?? 0,
  dateStart: item.dateStart,
  dateEnd: item.dateEnd,
  base: (item.base ?? 'LIST_PRICE') as PricelistBase,
  basePricelistId: item.basePricelistId,
  computePrice: (item.computePrice ?? 'FIXED') as ComputePrice,
  fixedPrice: money(item.fixedPrice),
  percentPrice: item.percentPrice ?? 0,
  priceDiscount: item.priceDiscount ?? 0,
  priceMarkup: item.priceMarkup ?? 0,
  priceRound: money(item.priceRound),
  priceSurcharge: money(item.priceSurcharge),
  priceMinMargin: money(item.priceMinMargin),
  priceMaxMargin: money(item.priceMaxMargin),
});

// The products a label print covers: the chosen templates or variants, or the products of a
// transfer's moves with the moves themselves.
export const readProductLabelData = async (
  find: RowFinder,
  objectSingular: string,
  recordIds: string[],
  pricelistId: string | null,
): Promise<ProductLabelData> => {
  const units = await readUnits();
  const pricelists = await readPricelists(pricelistId);

  if (objectSingular === 'productTemplate') {
    return { products: await readTemplateProducts(recordIds, units), moves: null, pricelists };
  }
  if (objectSingular === 'productProduct') {
    return { products: await readVariantProducts(recordIds, units), moves: null, pricelists };
  }
  const transferMoves = await readTransferMoves(find, recordIds);
  const moves: LabelMove[] = transferMoves.flatMap(({ move, lines }) =>
    move.productId === null
      ? []
      : [
          {
            productId: move.productId,
            quantity: move.quantity ?? 0,
            demand: move.productUomQty ?? 0,
            lines: lines.flatMap((line) =>
              line.productId === null
                ? []
                : [
                    {
                      productId: line.productId,
                      quantity: line.quantity ?? 0,
                      lotName: text(line.lot?.name ?? line.lotName),
                      isUnitLike: units.isUnitLike(line.productUomId),
                    },
                  ],
            ),
          },
        ],
  );

  return { products: await readVariantProducts([...new Set(moves.map((move) => move.productId))], units), moves, pricelists };
};

// Lots in the order asked for, repeated as asked; a lot with no row is skipped.
export const readLotLabelRows = async (find: RowFinder, lotIds: string[]): Promise<LotLabelRow[]> => {
  const rows = await readInChunks([...new Set(lotIds)], (part) =>
    findIn<LotRow>(find, stockLots, { id: { in: part } }, 'id name product { deletedAt name defaultCode productTmplId }'),
  );
  const templateNames = new Map(
    (
      await findByIds<{ id: string; name: string | null }>(
        productTemplates,
        rows.flatMap((row) => row.product?.productTmplId ?? []),
        'id name',
      )
    ).map((row) => [row.id, text(row.name)]),
  );
  const byId = new Map(
    rows.map((row): [string, LotLabelRow] => [
      row.id,
      {
        id: row.id,
        name: text(row.name),
        productName: text(row.product?.name),
        templateName: templateNames.get(row.product?.productTmplId ?? '') ?? text(row.product?.name),
        defaultCode: text(row.product?.defaultCode),
      },
    ]),
  );

  return lotIds.flatMap((id) => byId.get(id) ?? []);
};

// The lots on the transfers' lines, transfer by transfer, for one label per lot or per unit.
export const readTransferLotLines = async (find: RowFinder, pickingIds: string[]) => {
  const units = await readUnits();
  const lines: (LineRow & { pickingId: string | null })[] = [];

  for (const part of chunks([...new Set(pickingIds)], ID_CHUNK)) {
    lines.push(
      ...(await findIn<LineRow & { pickingId: string | null }>(find, stockMoveLines, { pickingId: { in: part } }, `pickingId ${LINE_SELECTION}`)),
    );
  }

  return [...new Set(pickingIds)].flatMap((pickingId) =>
    orderMoveLines(
      lines.filter((line) => line.pickingId === pickingId).map((line) => ({ ...line, resultPackageName: text(line.resultPackage?.name) })),
    ).map((line) => ({ lotId: line.lotId, quantity: line.quantity ?? 0, isUnitLike: units.isUnitLike(line.productUomId) })),
  );
};
