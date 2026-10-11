import { type PackageQuantRow } from 'src/stock/printing/types/package-quant-row.type';

// `quants` are the rows held in the package itself; each child lists the rows in it and in every
// package inside it. The counts include rows at zero, which decide whether loose content gets its
// own "No assigned package" section.
export type PackagePrintData = {
  name: string;
  packDate: string | null;
  packageTypeName: string;
  quants: PackageQuantRow[];
  children: { name: string; packDate: string | null; quants: PackageQuantRow[] }[];
  containedQuantCount: number;
  directQuantCount: number;
};
