import { hasGtinCheckDigit } from 'src/stock/printing/utils/picking-documents.util';

// A package named with a valid SSCC (18 digits, GS1 check digit) prints the GS1 code for it.
export const isValidSscc = (name: string) => /^\d{18}$/.test(name) && hasGtinCheckDigit(name);

// The GS1 element string of a package: (00) the SSCC, then (13) the pack date as YYMMDD when set.
export const ssccElementString = (name: string, packDate: string | null) =>
  packDate === null || packDate === ''
    ? `00${name}`
    : `00${name}13${packDate.slice(2, 4)}${packDate.slice(5, 7)}${packDate.slice(8, 10)}`;
