import { type PackTarget } from 'src/stock/utils/types/pack-target.type';

export type PutInPackPlan =
  | { kind: 'refuse'; reason: string }
  | { kind: 'nothing' }
  | { kind: 'askDestination'; lineIds: string[]; locationDestIds: string[] }
  | { kind: 'askPackage'; lineIds: string[]; packageIds: string[]; defaultLocationDestId: string | null }
  | { kind: 'packLines'; lineIds: string[]; target: PackTarget; singleLine: boolean }
  | { kind: 'packPackages'; packageIds: string[]; target: PackTarget };
