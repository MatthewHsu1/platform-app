import { describe, expect, it } from 'vitest';

import { makeAddNotes } from 'src/shared/triggers/put-back';

type Link = { noteId: string; targetStockLotId: string };

// Twenty writes at most 100 rows in one request, so 250 lots go in parts of 100, 100 and 50.
const lotIds = Array.from({ length: 250 }, (_, index) => `lot${index}`);
const secondPart = lotIds.slice(100, 200);

const setup = ({ failLinksFor, failRemove = false }: { failLinksFor: string; failRemove?: boolean }) => {
  const notes = new Set<string>();
  const links: Link[] = [];
  const addNotes = makeAddNotes({
    createNotes: async (rows) => {
      rows.forEach((row) => notes.add(row.id));
    },
    createNoteTargets: async (rows) => {
      const parts = rows as Link[];

      if (parts.some((row) => row.targetStockLotId === failLinksFor)) {
        throw new Error('Record not found');
      }
      links.push(...parts);
    },
    destroyNotes: async (ids) => {
      if (failRemove) {
        throw new Error('Network error');
      }
      ids.forEach((id) => notes.delete(id));
    },
  });

  return { addNotes, notes, links };
};

const run = async (addNotes: ReturnType<typeof makeAddNotes>) =>
  addNotes(
    'stockLot',
    lotIds.map((recordId) => ({ recordId, title: 'Change undone', body: 'Too many lots' })),
  ).then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );

describe('addNotes', () => {
  it('when one part fails, writes the other parts, names the failed records and leaves no note without its link', async () => {
    const { addNotes, notes, links } = setup({ failLinksFor: 'lot150' });

    const message = await run(addNotes);

    expect({
      linked: links.map((link) => link.targetStockLotId),
      unlinkedNotes: [...notes].filter((id) => !links.some((link) => link.noteId === id)),
      namesFailedRecords: message.includes(secondPart.join(', ')),
    }).toEqual({
      linked: [...lotIds.slice(0, 100), ...lotIds.slice(200)],
      unlinkedNotes: [],
      namesFailedRecords: true,
    });
  });

  it('names every note left without its link when it cannot be removed', async () => {
    const { addNotes, notes, links } = setup({ failLinksFor: 'lot150', failRemove: true });

    const message = await run(addNotes);

    const unlinkedNotes = [...notes].filter((id) => !links.some((link) => link.noteId === id));
    expect({ count: unlinkedNotes.length, allNamed: unlinkedNotes.every((id) => message.includes(id)) }).toEqual({
      count: 100,
      allNamed: true,
    });
  });
});
