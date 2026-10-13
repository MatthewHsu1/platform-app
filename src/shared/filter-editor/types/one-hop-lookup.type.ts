import { type FilterCatalogueEntry } from 'src/shared/filter-editor/types/filter-catalogue-entry.type';

// Finds the ids of the related records that meet a condition, so a filter can
// name them: Twenty filters cannot follow a relation.
export type OneHopLookup = (
  hop: NonNullable<FilterCatalogueEntry['hop']>,
  condition: Record<string, unknown>,
) => Promise<string[]>;
