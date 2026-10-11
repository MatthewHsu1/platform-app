import { stockLots } from 'src/stock/lot/lot-records';
import { findIn } from 'src/stock/printing/print-rows';
import { type TracePrintLine } from 'src/stock/printing/types/trace-print-line.type';
import { unfoldPrintRows } from 'src/stock/printing/utils/traceability-print-tree.util';
import { traceabilityReport } from 'src/stock/reports/traceability/read-traceability';
import { stockMoveLines, stockPickings } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { type RowFinder } from 'src/stock/types/row-finder.type';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

// The name the printed report is headed with: the lot, the transfer, or the move line's product.
const readReferenceName = async (find: RowFinder, model: TraceabilityModel, recordId: string) => {
  if (model === 'stockMoveLine') {
    const [line] = await findIn<{ product: { name: string | null } | null }>(
      find,
      stockMoveLines,
      { id: { eq: recordId } },
      'product { deletedAt name }',
    );

    return line?.product?.name ?? '';
  }
  const [record] = await findIn<{ name: string | null }>(find, model === 'stockLot' ? stockLots : stockPickings, { id: { eq: recordId } }, 'name');

  return record?.name ?? '';
};

// The report as the user unfolded it, its rows worked out again through the print's reader.
export const readTraceabilityPrintLines = async (
  find: RowFinder,
  model: TraceabilityModel,
  recordId: string,
  openLineIds: string[],
): Promise<{ lines: TracePrintLine[]; reference: string }> => {
  const digits = readStockSettings().productUnitDigits;
  const unfolded = new Map<string, TraceRow[]>();
  const childrenOf = async (lineId: string) => {
    const known = unfolded.get(lineId) ?? (await traceabilityReport({ kind: 'unfold', lineId }, digits, find)).rows;

    unfolded.set(lineId, known);

    return known;
  };
  const top = await traceabilityReport({ kind: 'report', model, recordId }, digits, find);

  return { lines: await unfoldPrintRows(top.rows, openLineIds, childrenOf), reference: await readReferenceName(find, model, recordId) };
};
