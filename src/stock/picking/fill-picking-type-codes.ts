import { updateWhere } from 'src/shared/compare-and-set';
import { includingDeleted, MUTATION_MAXIMUM_RECORDS } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { chunks } from 'src/shared/utils/chunks.util';
import { groupBy } from 'src/shared/utils/group-by.util';
import { stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { planPickingTypeCodes } from 'src/stock/utils/plan-picking-type-codes.util';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type PickingTypeCodeRow } from 'src/stock/types/picking-type-code-row.type';

// Transfers made before they kept their type of operation show none: they get their operation
// type's code, trashed ones too. A by-id update does not reach a trashed row, so the filter names
// deletedAt. A failed part does not stop the others; all failures are reported.
export const fillPickingTypeCodes = async () => {
  const [pickings, types] = await Promise.all([
    stockPickings.findIncludingDeleted<PickingTypeCodeRow>(
      { pickingTypeCode: { is: 'NULL' }, pickingTypeId: { is: 'NOT_NULL' } },
      'id pickingTypeId pickingTypeCode',
    ),
    stockPickingTypes.findIncludingDeleted<{ id: string; code: PickingTypeCode }>({}, 'id code'),
  ]);
  const fills = planPickingTypeCodes({ pickings, codeByTypeId: new Map(types.map((type) => [type.id, type.code])) });
  const errors = errorCollector();

  for (const [code, rows] of groupBy(fills, (row) => row.pickingTypeCode ?? '')) {
    for (const [index, part] of chunks(rows.map((row) => row.id), MUTATION_MAXIMUM_RECORDS).entries()) {
      await errors.run(`${code} part ${index + 1}`, () =>
        updateWhere({
          objectSingular: 'stockPicking',
          objectPlural: 'stockPickings',
          filter: includingDeleted({ id: { in: part } }),
          data: { pickingTypeCode: code },
        }),
      );
    }
  }
  errors.throwIfAny();
};
