export type PackageContent = {
  packageId: string;
  parentPackageId: string | null;
  packageDestId: string | null;
  isReusable: boolean;
  descendantIds: string[];
  childIds: string[];
  quants: { productId: string; lotId: string | null; quantity: number }[];
};
