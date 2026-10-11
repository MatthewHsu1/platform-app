// Where a package went in the transfer, frozen when it was validated.
export type PickingPrintPackageHistory = {
  id: string;
  packageId: string;
  packageName: string;
  // The package's full name inside its containers, outermost first, joined with " > ".
  completeName: string;
  from: string;
  parentOrigName: string;
  to: string;
  parentDestId: string | null;
  parentDestName: string;
  outermostDestId: string | null;
};
