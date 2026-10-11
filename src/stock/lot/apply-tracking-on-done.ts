import { assignLotsAtValidate } from 'src/stock/lot/validate/assign-lots-at-validate';
import { writePackageHistory } from 'src/stock/package/validate/write-package-history';

// Lots made from typed names, and set on their lines before the lines are committed; then the package history,
// taken before the stock moves. Counts keep no package history.
export const applyTrackingOnDone = async (moveLineIds: string[], options: { skipPackageHistory: boolean }): Promise<void> => {
  await assignLotsAtValidate(moveLineIds);
  if (!options.skipPackageHistory) {
    await writePackageHistory(moveLineIds);
  }
};
