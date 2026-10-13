import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

type ScalarKind = 'text' | 'number' | 'currency' | 'date' | 'select' | 'multiSelect';

// One field a stored filter may name. `name` is the editor's field name: a
// plain field, a composite part ("emailFrom.primaryEmail"), a relation
// ("stage") or a field of a related record ("company.name").
export type FilterCatalogueEntry = {
  name: string;
  label: string;
  kind: ScalarKind | 'relation';
  operators: FilterOperator[];
  options?: readonly string[];
  relation?: { objectSingular: string; objectPlural: string; labelField: string; labelKind: 'text' | 'fullName' };
  hop?: { relationField: string; objectSingular: string; objectPlural: string; field: string; kind: ScalarKind };
};
