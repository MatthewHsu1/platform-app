import { type PackageContentLine } from 'src/stock/utils/types/package-content-line.type';

export type PackageContentSummary = {
  lines: PackageContentLine[];
  description: string;
  weight: number;
  ownerId: string | null;
};
