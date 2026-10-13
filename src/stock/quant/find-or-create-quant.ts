import { quantKey } from 'src/stock/quant/quant-key';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { nowIso } from 'src/stock/stock-settings';
import { type QuantRow } from 'src/stock/types/quant-row.type';

// A row to count at a key that holds no stock yet, made the way the quant engine makes one. Two clicks on the same
// key meet on the unique key index; the second one reads the first one's row.
export const findOrCreateQuant = async ({
  productId,
  locationId,
  lotId,
  ownerId,
}: {
  productId: string;
  locationId: string;
  lotId: string | null;
  ownerId: string | null;
}): Promise<QuantRow> => {
  const key = quantKey({ productId, locationId, lotId, packageId: null, ownerId });
  const findByKey = async () => (await stockQuants.find<QuantRow>({ quantKey: { eq: key } }, QUANT_ROW))[0];
  const existing = await findByKey();

  if (existing !== undefined) {
    return existing;
  }
  await graphqlQuantStore.create(key, { quantity: 0, reservedQuantity: 0, inDate: nowIso() });

  const created = await findByKey();

  if (created === undefined) {
    throw new Error(`The stock row ${key} could not be made.`);
  }

  return created;
};
