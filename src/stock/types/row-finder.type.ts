// Reads every page of the rows of one object that match a filter.
export type RowFinder = <TRow>(
  objectSingular: string,
  objectPlural: string,
  filter: Record<string, unknown>,
  selection: string,
) => Promise<TRow[]>;
