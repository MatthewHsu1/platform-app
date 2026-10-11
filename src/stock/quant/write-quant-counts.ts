import { backoffMs } from 'src/shared/backoff';
import { compareAndSet } from 'src/shared/compare-and-set';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { type QuantRow } from 'src/stock/types/quant-row.type';

const ATTEMPTS = 10;

const readQuant = async (quantId: string) => (await stockQuants.find<QuantRow>({ id: { eq: quantId } }, QUANT_ROW))[0];

// The count fields share the row with the stock level the quant engine writes under compare-and-set, so these
// writes go through compare-and-set too: on a clash the row is read again and planned from what it holds now.
// `plan` returns null to leave a row as it is. Returns the ids written.
export const writeQuantCounts = async (
  quantIds: string[],
  plan: (quant: QuantRow) => Record<string, unknown> | null,
): Promise<string[]> => {
  const ids = [...new Set(quantIds)];

  if (ids.length === 0) {
    return [];
  }
  const firstRead = new Map(
    (await stockQuants.find<QuantRow>({ id: { in: ids } }, QUANT_ROW)).map((quant) => [quant.id, quant]),
  );
  const written: string[] = [];

  for (const quantId of ids) {
    let quant = firstRead.get(quantId);

    for (let attempt = 1; quant !== undefined; attempt += 1) {
      const data = plan(quant);

      if (data === null) {
        break;
      }
      const reached = await compareAndSet({
        objectSingular: 'stockQuant',
        objectPlural: 'stockQuants',
        id: quant.id,
        version: quant.version,
        data: { ...data, version: quant.version + 1 },
      });

      if (reached) {
        written.push(quant.id);
        break;
      }
      if (attempt >= ATTEMPTS) {
        throw new Error(`The count of stock row ${quantId} kept changing; it was not written.`);
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
      quant = await readQuant(quantId);
    }
  }

  return written;
};
