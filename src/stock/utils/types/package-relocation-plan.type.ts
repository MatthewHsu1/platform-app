export type PackageRelocationPlan =
  | { kind: 'nothing' }
  | { kind: 'refuse'; reason: string }
  | { kind: 'move'; quantIds: string[]; upToParentPackageIds: string[] };
