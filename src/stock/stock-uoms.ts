import { uomUoms } from 'src/stock/stock-records';
import { resolveUoms } from 'src/uom/utils/uom.util';
import { type UomRow } from 'src/uom/utils/types/uom-row.type';

// Archived units still convert: old moves keep them.
export const readResolvedUoms = async () =>
  resolveUoms(await uomUoms.find<UomRow>({}, 'id name relativeUomId relativeFactor seedKey')).resolved;
