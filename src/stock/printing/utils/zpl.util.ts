import { type ZplProductLabel } from 'src/stock/printing/types/zpl-product-label.type';
import { type ZplTemplate } from 'src/stock/printing/types/zpl-template.type';
import { dayInTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { isValidSscc, ssccElementString } from 'src/stock/printing/utils/sscc.util';

// Label printers read these files as they are: field data is printed raw, and line breaks between
// commands are ignored. Several labels in one file print one after the other.

// A whole factor keeps one decimal ("6.0"), as the factor is a decimal number.
const decimalText = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value));

const productBody = (label: ZplProductLabel, template: ZplTemplate) => {
  const showPerUnit = label.pricePerUnit !== null && label.referenceUnitName !== null;
  const lines: string[] = [];

  if (template === 'normal') {
    lines.push(`^FT35,40^A0N,25^FD${label.firstLine}^FS`);
    if (label.secondLine) lines.push(`^FT35,65^A0N,20^FD${label.secondLine}^FS`);
    if (label.barcode) lines.push(`^FO35,77^BY2 ^BCN,100,Y,N,N ^FD${label.barcode}^FS`);
    if (label.price !== null) {
      if (showPerUnit) lines.push(`^FO150,210 ^A0N,25^FH ^FD( ${label.pricePerUnit} / ${label.referenceUnitName} )^FS`);
      lines.push(`^FO300,200 ^A0N,40^FH ^FD${label.price}^FS`);
    }
  } else if (template === 'alternative') {
    lines.push(`^FT35,30^A0N,20^FD${label.firstLine}^FS`);
    if (label.secondLine) lines.push(`^FT35,48^A0N,15^FD${label.secondLine}^FS`);
    if (label.barcode) lines.push(`^FO35,55^BY2 ^BCN,100,Y,N,N ^FD${label.barcode}^FS`);
    if (label.price !== null) {
      if (showPerUnit) lines.push(`^FO160,185 ^A0N,18^FH ^FD( ${label.pricePerUnit} / ${label.referenceUnitName} )^FS`);
      lines.push(`^FO290,165 ^A0N,30^FH ^FD${label.price}^FS`);
    }
  } else if (template === 'small') {
    lines.push(`^FT35,30^A0N,20^FD${label.firstLine}^FS`);
    if (label.barcode) lines.push(`^FO35,50^BY1 ^BCN,80,Y,N,N ^FD${label.barcode}^FS`);
    if (label.price !== null) lines.push(`^FO150,165 ^A0N,25^FH ^FD${label.price}^FS`);
  } else {
    lines.push(`^FT210,30^A0N,25^FD${label.firstLine}^FS`);
    if (label.barcode) lines.push(`^FO35,5^BY1 ^BCN,80,Y,N,N ^FD${label.barcode}^FS`);
    if (label.price !== null) lines.push(`^FO290,50 ^A0N,30^FH ^FD${label.price}^FS`);
  }

  return lines.map((line) => `${line}\n`).join('');
};

export const zplProductLabels = (labels: ZplProductLabel[], template: ZplTemplate) =>
  labels
    .flatMap((label) =>
      Array.from({ length: Math.max(0, Math.trunc(label.quantity)) }, () => `\n\n^XA^CI28\n\n${productBody(label, template)}^XZ\n`),
    )
    .join('');

export const zplLotLabels = (lots: { productDisplayName: string; lotName: string }[]) =>
  lots
    .map(
      (lot) =>
        `\n\n^XA^CI28\n^FO100,50\n^A0N,44,33^FD${lot.productDisplayName}^FS\n^FO100,100\n^A0N,44,33^FDLN/SN: ${lot.lotName}^FS\n\n^FO100,150^BY3\n^BCN,100,Y,N,N\n^FD${lot.lotName}^FS\n^XZ\n`,
    )
    .join('');

// A package named with a valid SSCC gets its name and details as text beside a DataMatrix of the
// GS1 code; any other package gets its name and a Code 128 of it.
export const zplPackageLabels = (packages: { name: string; packDate: string | null; packageTypeName: string }[], timeZone: string) =>
  packages
    .map((pack) =>
      isValidSscc(pack.name)
        ? [
            '\n^XA',
            '^FO310,50',
            `^A0N,44,33^FDSSCC: ${pack.name}^FS`,
            '^FO310,100^BY3',
            pack.packDate ? `^A0N,44,33^FDPack Date: ${dayInTimeZone(pack.packDate, timeZone)}^FS` : '',
            '^FO310,150^BY3',
            pack.packageTypeName ? `^A0N,44,33^FDPackage Type: ${pack.packageTypeName}^FS` : '',
            '^FO100,50^BY3',
            '^BXN,10,200',
            `^FD${ssccElementString(pack.name, pack.packDate)}^FS`,
            '^XZ\n',
          ].join('\n')
        : `\n^XA\n^FO100,50\n^A0N,44,33^FD${pack.name}^FS\n^FO100,100^BY3\n^BCN,100,Y,N,N\n^FD${pack.name}^FS\n^XZ\n`,
    )
    .join('');

export const zplPickingTypeLabels = (types: { name: string; barcode: string }[]) =>
  types
    .map(
      (type) =>
        `\n^XA\n^FO100,50\n^A0N,44,33^FD${type.name}^FS\n${type.barcode ? `\n^FO100,100\n^BCN,100,Y,N,N\n^FD${type.barcode}^FS\n` : ''}\n^XZ\n`,
    )
    .join('');

export const zplPackagingLabels = (
  packagings: { uomName: string; productDisplayName: string; relativeFactor: number; barcode: string }[],
) =>
  packagings
    .map(
      (packaging) =>
        `\n^XA\n^FO100,50\n^A0N,44,33^FD${packaging.uomName}^FS\n^FO100,100\n^A0N,44,33^FD${packaging.productDisplayName}^FS\n^FO100,150\n^A0N,44,33^FDQty: ${decimalText(packaging.relativeFactor)} ${packaging.uomName}^FS\n${packaging.barcode ? `\n^FO100,200^BY3\n^BCN,100,Y,N,N\n^FD${packaging.barcode}^FS\n` : ''}\n^XZ\n`,
    )
    .join('');
