import { updateWhere } from 'src/shared/compare-and-set';
import { includingDeleted, MUTATION_MAXIMUM_RECORDS } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { chunks } from 'src/shared/utils/chunks.util';
import { stockPickings } from 'src/stock/stock-records';
import { planPickingTypeCodes } from 'src/stock/utils/plan-picking-type-codes.util';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type PickingTypeCodeRow } from 'src/stock/types/picking-type-code-row.type';

// Every transfer of the type shows its type of operation: done, cancelled and
// trashed ones too. A by-id update does not reach a trashed row, so the filter
// names deletedAt. A failed part does not stop the others; all failures are reported.
export const followTypeCode = async (type: { id: string; code: PickingTypeCode }) => {
  const pickings = await stockPickings.findIncludingDeleted<PickingTypeCodeRow>(
    { pickingTypeId: { eq: type.id } },
    'id pickingTypeId pickingTypeCode',
  );
  const ids = planPickingTypeCodes({ pickings, codeByTypeId: new Map([[type.id, type.code]]) }).map((row) => row.id);
  const errors = errorCollector();

  for (const [index, part] of chunks(ids, MUTATION_MAXIMUM_RECORDS).entries()) {
    await errors.run(`${type.id} part ${index + 1}`, () =>
      updateWhere({
        objectSingular: 'stockPicking',
        objectPlural: 'stockPickings',
        filter: includingDeleted({ id: { in: part } }),
        data: { pickingTypeCode: type.code },
      }),
    );
  }
  errors.throwIfAny();
};
