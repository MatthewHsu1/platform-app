import { updateWhere } from 'src/shared/compare-and-set';
import { includingDeleted, records } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';

const CLAIM_SELECTION = 'id key runId startedAt finishedAt progress';
// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const MUTATION_MAXIMUM_RECORDS = 100;
const platformClaims = records('platformClaim', 'platformClaims');

// The unique index counts soft-deleted rows, so a claim someone soft-deleted
// still holds its key: every lookup names deletedAt to reach it.
const matchFilter = ({ key, runId }: { key: string; runId?: string }) =>
  includingDeleted({
    key: { eq: key },
    ...(runId === undefined ? {} : { runId: { eq: runId } }),
  });

export const graphqlClaimStore: ClaimStore = {
  create: async (row) => {
    try {
      await platformClaims.createMany([row]);
      return 'created';
    } catch (error) {
      // The unique key refused it when another run holds the key; any other failure leaves no row.
      if ((await graphqlClaimStore.findByKey(row.key)) !== null) {
        return 'exists';
      }
      throw error;
    }
  },
  // A refused part leaves the parts before it written; the caller finds those rows under its own run id.
  createMany: async (rows) => {
    for (let start = 0; start < rows.length; start += MUTATION_MAXIMUM_RECORDS) {
      const part = rows.slice(start, start + MUTATION_MAXIMUM_RECORDS);

      try {
        await platformClaims.createMany(part);
      } catch (error) {
        if ((await graphqlClaimStore.findByKeys(part.map((row) => row.key))).length > 0) {
          return 'exists';
        }
        throw error;
      }
    }
    return 'created';
  },
  findByKey: async (key) => {
    const [row] = await platformClaims.find<ClaimRow>(matchFilter({ key }), CLAIM_SELECTION);
    return row ?? null;
  },
  findByKeys: (keys) =>
    platformClaims.findIncludingDeleted<ClaimRow>({ key: { in: [...new Set(keys)] } }, CLAIM_SELECTION),
  updateWhere: async (match, data) =>
    (await updateWhere({ objectSingular: 'platformClaim', objectPlural: 'platformClaims', filter: matchFilter(match), data }))
      .length === 1,
  destroy: async (match) => {
    requireData(
      await twentyGraphql(
        'application',
        `mutation ReleaseClaim($filter: PlatformClaimFilterInput!) { destroyPlatformClaims(filter: $filter) { id } }`,
        { filter: matchFilter(match) },
      ),
      `Release claim ${match.key}`,
    );
  },
  destroyMany: async ({ keys, runId }) => {
    for (let start = 0; start < keys.length; start += MUTATION_MAXIMUM_RECORDS) {
      requireData(
        await twentyGraphql(
          'application',
          `mutation ReleaseClaims($filter: PlatformClaimFilterInput!) { destroyPlatformClaims(filter: $filter) { id } }`,
          { filter: includingDeleted({ key: { in: keys.slice(start, start + MUTATION_MAXIMUM_RECORDS) }, runId: { eq: runId } }) },
        ),
        `Release ${keys.length} claims`,
      );
    }
  },
  findStale: (startedBefore) =>
    platformClaims.findIncludingDeleted<ClaimRow>(
      { finishedAt: { is: 'NULL' }, startedAt: { lt: startedBefore } },
      CLAIM_SELECTION,
    ),
  destroyFinished: async (finishedBefore) => {
    const finished = (filter: Record<string, unknown>) => includingDeleted({ ...filter, finishedAt: { lt: finishedBefore } });
    const rows = await platformClaims.find<{ id: string }>(finished({}), 'id');

    for (let start = 0; start < rows.length; start += MUTATION_MAXIMUM_RECORDS) {
      requireData(
        await twentyGraphql(
          'application',
          `mutation SweepClaims($filter: PlatformClaimFilterInput!) { destroyPlatformClaims(filter: $filter) { id } }`,
          { filter: finished({ id: { in: rows.slice(start, start + MUTATION_MAXIMUM_RECORDS).map((row) => row.id) } }) },
        ),
        'Remove finished claims',
      );
    }
  },
  now: () => new Date(),
  newRunId: () => crypto.randomUUID(),
};
