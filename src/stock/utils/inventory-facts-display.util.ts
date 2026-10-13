import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { type ReorderingStat } from 'src/stock/utils/types/reordering-stat.type';

// The next serial matters only to a product tracked by lot or serial number.
export const showsNextSerial = (tracking: string) => tracking !== PRODUCT_TRACKING.NONE;

// One rule shows its min and max; otherwise a storable product shows how many rules it has.
export const reorderingStat = (
  summary: { nbrReorderingRules: number; reorderingMinQty: number; reorderingMaxQty: number },
  isStorable: boolean,
): ReorderingStat => {
  if (summary.nbrReorderingRules === 1) {
    return { kind: 'minMax', min: summary.reorderingMinQty, max: summary.reorderingMaxQty };
  }
  return isStorable ? { kind: 'count', count: summary.nbrReorderingRules } : null;
};
