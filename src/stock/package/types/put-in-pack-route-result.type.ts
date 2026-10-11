import { type PackageChoice } from 'src/stock/package/types/package-choice.type';

export type PutInPackRouteResult =
  | { kind: 'packed'; packageId: string; printouts: string[] }
  | { kind: 'askDestination'; lineIds: string[]; locationDestIds: string[] }
  | {
      kind: 'askPackage';
      lineIds: string[];
      packageIds: string[];
      defaultLocationDestId: string | null;
      // The existing packages the pop-up offers, of every type; the pop-up keeps those of the chosen type.
      choices: PackageChoice[];
      packageTypes: { id: string; label: string }[];
    };
