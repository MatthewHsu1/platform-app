import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type PickingTypeCodeRow } from 'src/stock/types/picking-type-code-row.type';

// A transfer shows the type of operation of its operation type; one with no
// type, or whose type is gone, shows none. Only rows that differ are returned.
export const planPickingTypeCodes = ({
  pickings,
  codeByTypeId,
}: {
  pickings: PickingTypeCodeRow[];
  codeByTypeId: Map<string, PickingTypeCode>;
}): { id: string; pickingTypeCode: PickingTypeCode | null }[] =>
  pickings.flatMap((picking) => {
    const pickingTypeCode = picking.pickingTypeId === null ? null : (codeByTypeId.get(picking.pickingTypeId) ?? null);

    return pickingTypeCode === picking.pickingTypeCode ? [] : [{ id: picking.id, pickingTypeCode }];
  });
