// One drop-down of the Roles page. The first level is "None" (no block); each higher level's block
// implies the one below. ownerFields name, once per object, the field the module's row rules read.
export type RoleModule = {
  key: string;
  label: string;
  levels: { key: string; label: string; blockKey: string | null }[];
  ownerFields: { objectUniversalIdentifier: string; ownerFieldUniversalIdentifier: string }[];
};
