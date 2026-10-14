// A field of the service order as the metadata API describes it.
export type OrderFieldInfo = {
  name: string;
  label: string;
  type: string;
  isActive: boolean;
  settings: { relationType?: string; joinColumnName?: string | null } | null;
};
