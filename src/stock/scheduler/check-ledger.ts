import { translate } from 'src/shared/i18n/translate';
import { graphqlLedgerStore } from 'src/stock/scheduler/ledger-store';
import { type LedgerStore } from 'src/stock/scheduler/types/ledger-store.type';
import { ledgerDifferences, planLedgerFixes } from 'src/stock/utils/plan-ledger-fixes.util';
import { planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';
import { type LedgerDifference } from 'src/stock/utils/types/ledger-difference.type';
import { type LedgerQuant } from 'src/stock/utils/types/ledger-quant.type';
import { chunks } from 'src/shared/utils/chunks.util';

export const LEDGER_RECHECK_WAIT_MS = 120_000;
const PRODUCT_CHUNK = 100;

const productOfKey = (key: string) => key.split('|')[0];

const noteBody = (from: number, to: number) =>
  translate(null, 'Stock level corrected from {from} to {to} to match the done move lines.', { from, to });

// The nightly check (the done lines are the truth): a key whose stock row differs from its done lines is read again after
// the wait, and only a difference that stayed the same on an unchanged row is written.
export const makeCheckLedger = (store: LedgerStore) => async () => {
  const digits = store.digits();
  const failures = new Map<string, string>();
  const readDifferences = async (productIds: string[]) => {
    const differences: LedgerDifference[] = [];
    const quantById = new Map<string, LedgerQuant>();
    const read = async (part: string[]) => {
      const [totals, quants] = await Promise.all([store.ledgerTotals(part), store.quants(part)]);

      quants.forEach((quant) => quantById.set(quant.id, quant));
      differences.push(...ledgerDifferences({ totals, quants, digits }));
    };

    // A chunk that cannot be read is read again product by product, so one product does not stop the others.
    for (const part of chunks(productIds, PRODUCT_CHUNK)) {
      try {
        await read(part);
      } catch {
        for (const productId of part) {
          try {
            await read([productId]);
          } catch (error) {
            failures.set(productId, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
    return { differences, quantById };
  };
  const reportFailures = () => {
    if (failures.size > 0) {
      throw new Error(
        `The stock check could not read ${failures.size} products: ${[...failures].map(([productId, reason]) => `${productId}: ${reason}`).join(' | ')}`,
      );
    }
  };

  const { differences: first } = await readDifferences(await store.storableProductIds());

  if (first.length === 0) {
    reportFailures();
    return { fixed: [], settled: [] };
  }

  await store.wait(LEDGER_RECHECK_WAIT_MS);
  const { differences: second, quantById } = await readDifferences([
    ...new Set(first.map((difference) => productOfKey(difference.key))),
  ]);

  // A miss means the row moved after the second read: tomorrow's check looks at it again.
  const writeLedgerTotal = async (quant: LedgerQuant, ledgerTotal: number) => {
    const written = await store.compareAndSet(
      quant.id,
      quant.version,
      planQuantWrite({
        quant: {
          ...quant,
          inDate: null,
          inventoryQuantitySet: quant.inventoryQuantitySet ?? false,
          inventoryQuantity: quant.inventoryQuantity ?? null,
          inventoryDiffQuantity: quant.inventoryDiffQuantity ?? null,
        },
        quantity: ledgerTotal,
        digits,
        now: store.now(),
      }),
    );

    if (written) {
      await store.addNote(quant.id, noteBody(quant.quantity, ledgerTotal));
    }
    return written;
  };
  const fixMissingRow = async (key: string, ledgerTotal: number) => {
    const restored = await store.restoreQuant(key);

    if (restored !== null) {
      return writeLedgerTotal(restored, ledgerTotal);
    }
    const createdId = await store.createQuant(key, ledgerTotal);

    if (createdId !== null) {
      await store.addNote(createdId, noteBody(0, ledgerTotal));
    }
    return createdId !== null;
  };
  const fixed: string[] = [];

  for (const fix of planLedgerFixes({ first, second, digits })) {
    const quant = fix.quantId === null ? undefined : quantById.get(fix.quantId);
    const written =
      quant === undefined ? await fixMissingRow(fix.key, fix.ledgerTotal) : await writeLedgerTotal(quant, fix.ledgerTotal);

    if (written) {
      fixed.push(fix.key);
    }
  }

  const fixedKeys = new Set(fixed);

  reportFailures();
  return { fixed, settled: first.map((difference) => difference.key).filter((key) => !fixedKeys.has(key)) };
};

export const checkLedger = makeCheckLedger(graphqlLedgerStore);
