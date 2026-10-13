// The i-th item goes to salesperson i modulo their number.
export const roundRobin = <TItem>(items: TItem[], salespersonIds: string[]) =>
  salespersonIds.length === 0
    ? []
    : items.map((item, index) => ({ item, salespersonId: salespersonIds[index % salespersonIds.length] }));
