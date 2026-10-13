import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { updateWhere } from 'src/shared/compare-and-set';
import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';
import { type GenerateLotLinesStore } from 'src/stock/lot/types/generate-lot-lines-store.type';
import { type MoveForLots } from 'src/stock/lot/types/move-for-lots.type';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { deleteAsUser, findAsPerson, personMoveLines } from 'src/stock/stock-person-writes';
import { stockMoveLines } from 'src/stock/stock-records';
import { toDateOrder } from 'src/stock/utils/parse-lot-date.util';
import { chunks } from 'src/shared/utils/chunks.util';

const PAGE_SIZE = 200;
// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const MUTATION_MAXIMUM_RECORDS = 100;

export const graphqlGenerateLotLinesStore: GenerateLotLinesStore = {
  // Twenty drops a relation nested under a to-one relation unless that relation
  // also selects deletedAt.
  readMove: async (moveId) =>
    requireData(
      await twentyGraphql<{ stockMove: MoveForLots | null }>(
        'person',
        `query MoveForLots($id: UUID!) {
          stockMove(filter: { id: { eq: $id } }) {
            id state productId productUomId locationId locationDestId pickingId productQty
            product { deletedAt productTmpl { deletedAt uomId tracking useExpirationDate expirationTime
              lotSequence { id prefix padding numberNext numberIncrement } } }
            pickingType { useExistingLots }
            picking { deletedAt scheduledDate pickingType { useExistingLots } }
          }
        }`,
        { id: moveId },
      ),
      'Read the move',
    ).stockMove,

  readDateOrder: async () => {
    const found = await twentyMetadata<{ currentUser: { workspaceMember: { dateFormat: string | null } | null } | null }>(
      'person',
      `{ currentUser { workspaceMember { dateFormat } } }`,
    );

    return toDateOrder(found.data?.currentUser?.workspaceMember?.dateFormat ?? null);
  },

  readOpenLineIds: async (moveId) =>
    (
      await findAsPerson<{ id: string }>(
        'stockMoveLines',
        'StockMoveLineFilterInput',
        { moveId: { eq: moveId }, not: { state: { in: [MOVE_STATE.DONE] } } },
        'id',
      )
    ).map((line) => line.id),

  putawayDestinations,

  // Lots are found by product and name, or made by the clicking user.
  lotIdsByName: async (productId, names) => {
    const wanted = [...new Set(names)];
    const byName = new Map<string, string>();

    for (const part of chunks(wanted, PAGE_SIZE)) {
      const existing = await findAsPerson<{ id: string; name: string | null }>(
        'stockLots',
        'StockLotFilterInput',
        { productId: { eq: productId }, name: { in: part } },
        'id name',
      );

      existing.forEach((lot) => {
        if (lot.name !== null) {
          byName.set(lot.name, lot.id);
        }
      });
    }
    const missing = wanted.filter((name) => !byName.has(name));

    for (const part of chunks(missing, MUTATION_MAXIMUM_RECORDS)) {
      const created = requireData(
        await twentyGraphql<{ createStockLots: { id: string; name: string }[] }>(
          'person',
          `mutation CreateLots($data: [StockLotCreateInput!]!) { createStockLots(data: $data) { id name } }`,
          { data: part.map((name) => ({ productId, name })) },
        ),
        'Create lots',
      );

      created.createStockLots.forEach((lot) => byName.set(lot.name, lot.id));
    }

    return byName;
  },

  deleteLines: (lineIds) => deleteAsUser('stockMoveLine', lineIds),

  createMissingLines: (rows) => createMissingRows(personMoveLines, rows),

  readExpirationDates: async (lineIds) =>
    new Map(
      (await stockMoveLines.find<{ id: string; expirationDate: string | null }>({ id: { in: lineIds } }, 'id expirationDate')).map(
        (line) => [line.id, line.expirationDate],
      ),
    ),

  // The expiration date of a line is written by the app: users cannot type it.
  writeExpirationDate: (lineIds, expirationDate) => stockMoveLines.updateMany(lineIds, { expirationDate }),

  // Only when no one took a number meanwhile: gaps in a sequence are allowed.
  jumpSequence: async (sequenceId, from, to) => {
    await updateWhere({
      objectSingular: 'irSequence',
      objectPlural: 'irSequences',
      filter: { id: { eq: sequenceId }, numberNext: { eq: from } },
      data: { numberNext: to },
    });
  },

  now: () => new Date(),
};
