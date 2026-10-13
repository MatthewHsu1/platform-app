import { type TracePrintLine } from 'src/stock/printing/types/trace-print-line.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

// The report as the user had it on screen: its rows, and under each row they unfolded the rows
// one step upstream of it, again and again. A line already on the way down is not unfolded
// twice, so a loop in the data ends.
export const unfoldPrintRows = async (
  rows: TraceRow[],
  openLineIds: string[],
  childrenOf: (lineId: string) => Promise<TraceRow[]>,
): Promise<TracePrintLine[]> => {
  const open = new Set(openLineIds);
  const expand = async (shown: TraceRow[], level: number, path: Set<string>): Promise<TracePrintLine[]> => {
    const lines: TracePrintLine[] = [];

    for (const row of shown) {
      lines.push({ row, level });
      if (row.unfoldable && open.has(row.lineId) && !path.has(row.lineId)) {
        lines.push(...(await expand(await childrenOf(row.lineId), level + 1, new Set([...path, row.lineId]))));
      }
    }
    return lines;
  };

  return expand(rows, 1, new Set());
};

// The lines whose rows are unfolded and on screen: open keys are row paths ("/a/b"), and a row
// under a folded one is not shown.
export const shownOpenLineIds = (open: Record<string, boolean>) => {
  const isShown = (key: string) => {
    const parts = key.split('/').slice(1);

    return parts.every((_, index) => open[`/${parts.slice(0, index + 1).join('/')}`] === true);
  };

  return [...new Set(Object.keys(open).filter(isShown).map((key) => key.slice(key.lastIndexOf('/') + 1)))];
};
