import { backoffMs } from 'src/shared/backoff';
import { updateWhere } from 'src/shared/compare-and-set';
import { records } from 'src/shared/triggers/records';
import { type SequenceStore } from 'src/base/sequence/types/sequence-store.type';

const ATTEMPTS = 10;

export const formatSequenceNumber = (prefix: string, padding: number, number: number) =>
  `${prefix}${String(number).padStart(padding, '0')}`;

export const makeSequenceNumbers = (store: SequenceStore) => {
  const nextNumber = async (sequenceId: string) => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      const sequence = await store.read(sequenceId);

      if (sequence === null) {
        throw new Error(`Sequence ${sequenceId} not found.`);
      }
      const taken = sequence.numberNext;

      if (await store.advance(sequenceId, taken, taken + sequence.numberIncrement)) {
        return formatSequenceNumber(sequence.prefix ?? '', sequence.padding, taken);
      }
      if (attempt < ATTEMPTS) {
        await store.wait(backoffMs(attempt));
      }
    }
    throw new Error(`Could not take a number from sequence ${sequenceId} after ${ATTEMPTS} tries.`);
  };

  const nextNumberByCode = async (code: string) => {
    const sequenceId = await store.findActiveIdByCode(code);

    return sequenceId === null ? null : nextNumber(sequenceId);
  };

  return { nextNumber, nextNumberByCode };
};

const irSequences = records('irSequence', 'irSequences');

const graphqlSequenceStore: SequenceStore = {
  read: async (sequenceId) => {
    const [row] = await irSequences.find<{
      prefix: string | null;
      padding: number | null;
      numberNext: number | null;
      numberIncrement: number | null;
    }>({ id: { eq: sequenceId } }, 'prefix padding numberNext numberIncrement');

    return row === undefined
      ? null
      : {
          prefix: row.prefix,
          padding: row.padding ?? 0,
          numberNext: row.numberNext ?? 1,
          numberIncrement: row.numberIncrement ?? 1,
        };
  },
  advance: async (sequenceId, from, to) =>
    (
      await updateWhere({
        objectSingular: 'irSequence',
        objectPlural: 'irSequences',
        filter: { id: { eq: sequenceId }, numberNext: { eq: from } },
        data: { numberNext: to },
      })
    ).length === 1,
  findActiveIdByCode: async (code) => {
    const found = await irSequences.find<{ id: string; createdAt: string }>(
      { code: { eq: code }, active: { eq: true } },
      'id createdAt',
    );
    const [first] = found.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    return first?.id ?? null;
  },
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export const { nextNumber, nextNumberByCode } = makeSequenceNumbers(graphqlSequenceStore);
