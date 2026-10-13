export type PackageNode = {
  id: string;
  name: string;
  completeName: string;
  parentPackageId: string | null;
  packageDestId: string | null;
  locationId: string | null;
};
