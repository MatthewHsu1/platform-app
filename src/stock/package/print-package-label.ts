import { createCheckedPrintPass } from 'src/stock/printing/create-print-pass';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';

// The label of a package just packed, as a one-time link for the user who packed it: the small
// PDF label or the ZPL label, as the operation type asks.
export const printPackageLabel = async (packageId: string, format: 'PDF' | 'ZPL', timeZone: string): Promise<PrintLink[]> => {
  const created = await createCheckedPrintPass({
    report: format === 'ZPL' ? 'packageBarcodeZpl' : 'packageBarcodeSmall',
    objectSingular: 'stockPackage',
    recordIds: [packageId],
    options: {},
    timeZone,
  });

  return created === null ? [] : [created.link];
};
