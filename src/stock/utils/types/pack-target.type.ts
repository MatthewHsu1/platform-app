export type PackTarget =
  | { kind: 'existing'; packageId: string }
  | { kind: 'new'; packageTypeId: string | null; name: string | null };
