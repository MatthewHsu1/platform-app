import { packagingBarcodes } from 'src/product/variant/product-records';
import { stockLots } from 'src/stock/lot/lot-records';
import { stockPackageHistories, stockPackages } from 'src/stock/package/package-records';
import { findInOrder } from 'src/stock/printing/print-rows';
import { registerPrintable } from 'src/stock/printing/printables';
import { zplLotLabels, zplPackageLabels, zplPackagingLabels, zplPickingTypeLabels } from 'src/stock/printing/utils/zpl.util';
import { stockPickingTypes } from 'src/stock/stock-records';

type LotRow = { id: string; name: string | null; product: { name: string | null } | null };
type PackageRow = { id: string; name: string | null; packDate: string | null; packageType: { name: string | null } | null };
type HistoryRow = { id: string; packageId: string | null; packageName: string | null; package: Omit<PackageRow, 'id'> | null };
type TypeRow = { id: string; name: string | null; barcode: string | null };
type PackagingRow = {
  id: string;
  barcode: string | null;
  uom: { name: string | null; relativeFactor: number | null } | null;
  product: { name: string | null } | null;
};

const text = (value: string | null | undefined) => value ?? '';

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const PACKAGE_SELECTION = 'name packDate packageType { deletedAt name }';
const packageLabel = (row: Omit<PackageRow, 'id'>) => ({
  name: text(row.name),
  packDate: row.packDate,
  packageTypeName: text(row.packageType?.name),
});

// A variant's name already holds its internal reference and its attribute values.
// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
registerPrintable<LotRow>({
  key: 'lotLabelZpl',
  objectSingular: 'stockLot',
  objectPlural: 'stockLots',
  read: (recordIds, _options, find) =>
    findInOrder<LotRow>(find, stockLots, recordIds, 'id name product { deletedAt name }'),
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
  read: (recordIds, _options, find) =>
    findInOrder<PackageRow>(find, stockPackages, recordIds, PACKAGE_SELECTION),
  build: (rows) => ({ kind: 'zpl', text: zplPackageLabels(rows.map((row) => packageLabel(row))) }),
  fileName: () => 'Package Barcode (ZPL)',
});

// A history row prints its package's label; several rows of one package print it once.
registerPrintable<HistoryRow>({
  key: 'packageBarcodeZpl',
  objectSingular: 'stockPackageHistory',
  objectPlural: 'stockPackageHistories',
  read: (recordIds, _options, find) =>
    findInOrder<HistoryRow>(find, stockPackageHistories, recordIds, `id packageId packageName package { id deletedAt ${PACKAGE_SELECTION} }`),
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

    return {
      kind: 'zpl',
      text: zplPackageLabels(
        packages.map((row) =>
          packageLabel({ name: row.package?.name ?? row.packageName, packDate: row.package?.packDate ?? null, packageType: row.package?.packageType ?? null }),
        ),
      ),
    };
  },
  fileName: () => 'Package Barcode (ZPL)',
});

registerPrintable<TypeRow>({
  key: 'pickingTypeLabelZpl',
  objectSingular: 'stockPickingType',
  objectPlural: 'stockPickingTypes',
  read: (recordIds, _options, find) =>
    findInOrder<TypeRow>(find, stockPickingTypes, recordIds, 'id name barcode'),
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
  read: (recordIds, _options, find) =>
    findInOrder<PackagingRow>(
      find,
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
