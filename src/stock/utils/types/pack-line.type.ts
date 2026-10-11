export type PackLine = {
  id: string;
  pickingTypeId: string | null;
  state: string;
  quantity: number;
  picked: boolean;
  resultPackageId: string | null;
  locationDestId: string;
  // The package type of the move's packaging unit.
  packagingPackageTypeId: string | null;
};
