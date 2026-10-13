import { recomputeLot } from 'src/stock/lot/recompute-lot';
import { recomputePackage } from 'src/stock/package/recompute-package';
import { parseQuantKey } from 'src/stock/quant/quant-key';

// After stock moved on these keys, their lots and packages get their derived
// values again.
export const recomputeTrackingForKeys = async (keys: string[]) => {
  const parts = keys.map(parseQuantKey);

  await recomputeLot([...new Set(parts.flatMap((part) => part.lotId ?? []))]);
  await recomputePackage([...new Set(parts.flatMap((part) => part.packageId ?? []))]);
};
