import { stockLots } from 'src/stock/lot/lot-records';
import { findInOrder } from 'src/stock/printing/printables/read-package-print-data';
import { type TracePrintLine } from 'src/stock/printing/types/trace-print-line.type';
import { traceabilityReport } from 'src/stock/reports/traceability/read-traceability';
import { stockMoveLines, stockPickings } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

// The name the printed report is headed with: the lot, the transfer, or the move line's product.
const readReferenceName = async (model: TraceabilityModel, recordId: string) => {
  if (model === 'stockMoveLine') {
    const [line] = await findInOrder<{ id: string; product: { name: string | null } | null }>(
      stockMoveLines,
      [recordId],
      'id product { deletedAt name }',
    );

    return line?.product?.name ?? '';
  }
  const [record] = await findInOrder<{ id: string; name: string | null }>(model === 'stockLot' ? stockLots : stockPickings, [recordId], 'id name');

  return record?.name ?? '';
};

// The report as the user had it on screen: its rows, and under each row they unfolded the rows
// one step upstream of it, again and again. Rows are worked out afresh, as the app (the print
// page has no user); a line already on the way down is not unfolded twice, so a loop in the data
// ends.
export const readTraceabilityPrintLines = async (
  model: TraceabilityModel,
  recordId: string,
  openLineIds: string[],
): Promise<{ lines: TracePrintLine[]; reference: string }> => {
  const digits = readStockSettings().productUnitDigits;
  const open = new Set(openLineIds);
  const unfolded = new Map<string, TraceRow[]>();
  const childrenOf = async (lineId: string) => {
    const known = unfolded.get(lineId);

    if (known !== undefined) {
      return known;
    }
    const rows = (await traceabilityReport({ kind: 'unfold', lineId }, digits, 'application')).rows;

    unfolded.set(lineId, rows);

    return rows;
  };
  const expand = async (rows: TraceRow[], level: number, path: Set<string>): Promise<TracePrintLine[]> => {
    const lines: TracePrintLine[] = [];

    for (const row of rows) {
      lines.push({ row, level });
      if (row.unfoldable && open.has(row.lineId) && !path.has(row.lineId)) {
        lines.push(...(await expand(await childrenOf(row.lineId), level + 1, new Set([...path, row.lineId]))));
      }
    }
    return lines;
  };
  const top = await traceabilityReport({ kind: 'report', model, recordId }, digits, 'application');

  return { lines: await expand(top.rows, 1, new Set()), reference: await readReferenceName(model, recordId) };
};
