export type ApplyInventoryOptions = {
  inventoryName: string | null;
  accountingDate: string | null;
  // Rows the caller read with a count: one whose count is gone when its claim is taken was applied by someone else
  // meanwhile, and is skipped instead of being applied as a count of 0.
  countedQuantIds?: string[];
};
