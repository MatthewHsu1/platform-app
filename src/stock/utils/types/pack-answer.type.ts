// What the user chose for Put in Pack; `fromPackageWizard` once the Put in Pack pop-up answered.
export type PackAnswer = {
  packageId: string | null;
  packageTypeId: string | null;
  packageName: string | null;
  fromPackageWizard: boolean;
};
