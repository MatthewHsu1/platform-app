import { packagingBarcodes } from 'src/product/variant/product-records';
import { type Records } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { stockPackageHistories, stockPackages } from 'src/stock/package/package-records';
import { registerPrintable } from 'src/stock/printing/printables';
import { zplLotLabels, zplPackageLabels, zplPackagingLabels, zplPickingTypeLabels } from 'src/stock/printing/utils/zpl.util';
import { stockPickingTypes } from 'src/stock/stock-records';

type LotRow = { id: string; name: string | null; product: { name: string | null } | null };
type PackageRow = { id: string; name: string | null };
type HistoryRow = { id: string; packageId: string | null; packageName: string | null; package: { name: string | null } | null };
type TypeRow = { id: string; name: string | null; barcode: string | null };
type PackagingRow = {
  id: string;
  barcode: string | null;
  uom: { name: string | null; relativeFactor: number | null } | null;
  product: { name: string | null } | null;
};

const ID_CHUNK = 200;

// Labels print in the order the records were chosen; an id with no row is skipped.
const readInOrder = async <TRow extends { id: string }>(of: Records, ids: string[], selection: string) => {
  const byId = new Map<string, TRow>();

  for (const part of chunks([...new Set(ids)], ID_CHUNK)) {
    (await of.find<TRow>({ id: { in: part } }, selection)).forEach((row) => byId.set(row.id, row));
  }

  return ids.flatMap((id) => byId.get(id) ?? []);
};

const text = (value: string | null | undefined) => value ?? '';

// A variant's name already holds its internal reference and its attribute values.
// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
registerPrintable<LotRow>({
  key: 'lotLabelZpl',
  objectSingular: 'stockLot',
  objectPlural: 'stockLots',
  read: (recordIds) => readInOrder<LotRow>(stockLots, recordIds, 'id name product { deletedAt name }'),
  build: (rows) => ({
    kind: 'zpl',
    text: zplLotLabels(rows.map((row) => ({ productDisplayName: text(row.product?.name), lotName: text(row.name) }))),
  }),
  fileName: () => 'Lot/Serial Number (ZPL)',
});

registerPrintable<PackageRow>({
  key: 'packageBarcodeZpl',
  objectSingular: 'stockPackage',
  objectPlural: 'stockPackages',
  read: (recordIds) => readInOrder<PackageRow>(stockPackages, recordIds, 'id name'),
  build: (rows) => ({ kind: 'zpl', text: zplPackageLabels(rows.map((row) => ({ name: text(row.name) }))) }),
  fileName: () => 'Package Barcode (ZPL)',
});

// A history row prints its package's label; several rows of one package print it once.
registerPrintable<HistoryRow>({
  key: 'packageBarcodeZpl',
  objectSingular: 'stockPackageHistory',
  objectPlural: 'stockPackageHistories',
  read: (recordIds) =>
    readInOrder<HistoryRow>(stockPackageHistories, recordIds, 'id packageId packageName package { deletedAt name }'),
  build: (rows) => {
    const seen = new Set<string>();
    const packages = rows.filter((row) => {
      const key = row.packageId ?? row.id;

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);

      return true;
    });

    return { kind: 'zpl', text: zplPackageLabels(packages.map((row) => ({ name: text(row.package?.name ?? row.packageName) }))) };
  },
  fileName: () => 'Package Barcode (ZPL)',
});

registerPrintable<TypeRow>({
  key: 'pickingTypeLabelZpl',
  objectSingular: 'stockPickingType',
  objectPlural: 'stockPickingTypes',
  read: (recordIds) => readInOrder<TypeRow>(stockPickingTypes, recordIds, 'id name barcode'),
  build: (rows) => ({
    kind: 'zpl',
    text: zplPickingTypeLabels(rows.map((row) => ({ name: text(row.name), barcode: text(row.barcode) }))),
  }),
  fileName: () => 'Operation type (ZPL)',
});

registerPrintable<PackagingRow>({
  key: 'packagingBarcodeZpl',
  objectSingular: 'productUom',
  objectPlural: 'productUoms',
  read: (recordIds) =>
    readInOrder<PackagingRow>(
      packagingBarcodes,
      recordIds,
      'id barcode uom { deletedAt name relativeFactor } product { deletedAt name }',
    ),
  build: (rows) => ({
    kind: 'zpl',
    text: zplPackagingLabels(
      rows.map((row) => ({
        uomName: text(row.uom?.name),
        productDisplayName: text(row.product?.name),
        relativeFactor: row.uom?.relativeFactor ?? 1,
        barcode: text(row.barcode),
      })),
    ),
  }),
  fileName: () => 'Packaging Barcodes (ZPL)',
});
