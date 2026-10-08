// What each module asks the install hook to make. Field and view ids differ
// per workspace, so specs name objects by universal id and fields by name.

export type SelectOption = {
  value: string;
  label: string;
  color: string;
  position: number;
};

export type StaffListSpec = {
  objectUniversalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  type: 'SELECT' | 'MULTI_SELECT';
  defaultValue?: string;
  options: SelectOption[];
};

export type DefaultRowsSpec = {
  objectUniversalIdentifier: string;
  names: string[];
};

export type BoardSpec = {
  objectUniversalIdentifier: string;
  name: string;
  icon: string;
  groupByFieldName: string;
  hideWhere?: { fieldName: string; values: string[] };
};

export type SeedRow = {
  seedKey: string;
  values: Record<string, unknown>;
  parentSeedKey?: string;
  parentFieldName?: string;
};

export type SeedRowsSpec = { objectUniversalIdentifier: string; rows: SeedRow[] };

export type ValidationRuleSpec = {
  objectUniversalIdentifier: string;
  name: string;
  expression: string;
  message: string;
};

export type ModuleInstallSpec = {
  firstVersion: string;
  staffLists: StaffListSpec[];
  defaultRows: DefaultRowsSpec[];
  seedRows: SeedRowsSpec[];
  boards: BoardSpec[];
  validationRules: ValidationRuleSpec[];
};

export type InstallObject = {
  id: string;
  universalIdentifier: string;
  nameSingular: string;
  namePlural: string;
  fields: { id: string; name: string }[];
};
