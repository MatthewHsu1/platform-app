import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { MUTATION_MAXIMUM_RECORDS, records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { chunks } from 'src/shared/utils/chunks.util';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { randomId } from 'src/shared/utils/random-id.util';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

// A note attaches to a record through a target field named after the object.
const noteTargetFieldName = (objectSingular: string) => `target${capitalize(objectSingular)}Id`;

const notes = records('note', 'notes');
const noteTargets = records('noteTarget', 'noteTargets');

// With an id, a rerun finds the note it made (and its link) instead of adding a second one.
export const addNote = async ({
  objectSingular,
  recordId,
  title,
  body,
  id,
}: {
  objectSingular: string;
  recordId: string;
  title: string;
  body: string;
  id?: string;
}) => {
  if (id !== undefined) {
    await createMissingRows(notes, [{ id, data: { title, bodyV2: { markdown: body } } }]);
    await createMissingRows(noteTargets, [
      { id: derivedId('noteTarget', id), data: { noteId: id, [noteTargetFieldName(objectSingular)]: recordId } },
    ]);
    return;
  }
  const note = requireData(
    await twentyGraphql<{ createNote: { id: string } }>(
      'application',
      `mutation AddNote($data: NoteCreateInput!) { createNote(data: $data) { id } }`,
      { data: { title, bodyV2: { markdown: body } } },
    ),
    'Create note',
  );
  requireData(
    await twentyGraphql(
      'application',
      `mutation LinkNote($data: NoteTargetCreateInput!) { createNoteTarget(data: $data) { id } }`,
      { data: { noteId: note.createNote.id, [noteTargetFieldName(objectSingular)]: recordId } },
    ),
    'Link note',
  );
};

type NoteRow = { id: string; title: string; bodyV2: { markdown: string } };

type AddNotesStore = {
  createNotes: (rows: NoteRow[]) => Promise<unknown>;
  createNoteTargets: (rows: Record<string, unknown>[]) => Promise<unknown>;
  destroyNotes: (ids: string[]) => Promise<unknown>;
};

// A note on each record, 100 at a time: a part's notes, then their links. A part that fails does not stop the
// others; its error names its records. A note whose link failed is removed again, and if that fails too the error
// names the note, so no note is left attached to nothing without a word.
export const makeAddNotes =
  (store: AddNotesStore) => async (objectSingular: string, items: { recordId: string; title: string; body: string }[]) => {
    const errors = errorCollector();

    for (const part of chunks(items, MUTATION_MAXIMUM_RECORDS)) {
      await errors.run(`Notes on ${part.map((item) => item.recordId).join(', ')}`, async () => {
        const rows = part.map((item) => ({ ...item, id: randomId() }));
        const noteIds = rows.map((row) => row.id);

        await store.createNotes(rows.map((row) => ({ id: row.id, title: row.title, bodyV2: { markdown: row.body } })));
        try {
          await store.createNoteTargets(rows.map((row) => ({ noteId: row.id, [noteTargetFieldName(objectSingular)]: row.recordId })));
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);

          await store.destroyNotes(noteIds).catch(() => {
            throw new Error(`${reason}; notes left without their link: ${noteIds.join(', ')}`);
          });
          throw error;
        }
      });
    }
    errors.throwIfAny();
  };

export const addNotes = makeAddNotes({
  createNotes: (rows) => notes.createMany(rows),
  createNoteTargets: (rows) => noteTargets.createMany(rows),
  destroyNotes: (ids) => notes.destroyMany(ids),
});

// With ids chosen by the caller, a rerun finds the notes (and links) it made instead of adding a second set.
export const addNotesWithIds = async (
  objectSingular: string,
  items: { id: string; recordId: string; title: string; body: string }[],
) => {
  for (const part of chunks(items, MUTATION_MAXIMUM_RECORDS)) {
    await createMissingRows(
      notes,
      part.map((item) => ({ id: item.id, data: { title: item.title, bodyV2: { markdown: item.body } } })),
    );
    await createMissingRows(
      noteTargets,
      part.map((item) => ({
        id: derivedId('noteTarget', item.id),
        data: { noteId: item.id, [noteTargetFieldName(objectSingular)]: item.recordId },
      })),
    );
  }
};

// These saves are refused. Twenty has already saved, so the old values go
// back and a note says why.
export const putBack = async ({
  objectSingular,
  objectPlural,
  recordId,
  data,
  reason,
}: {
  objectSingular: string;
  objectPlural: string;
  recordId: string;
  data: Record<string, unknown>;
  reason: string;
}) => {
  await records(objectSingular, objectPlural).update(recordId, data);
  await addNote({ objectSingular, recordId, title: 'Change undone', body: reason });
};

export const restoreWithNote = async ({
  objectSingular,
  objectPlural,
  recordId,
  reason,
}: {
  objectSingular: string;
  objectPlural: string;
  recordId: string;
  reason: string;
}) => {
  await records(objectSingular, objectPlural).restore(recordId);
  await addNote({ objectSingular, recordId, title: 'Delete undone', body: reason });
};

// A rerun of the same delete batch finds the record already back and writes nothing.
export const restoreIfStillDeleted = async (input: { objectSingular: string; objectPlural: string; recordId: string; reason: string }) => {
  const [stored] = await records(input.objectSingular, input.objectPlural).findIncludingDeleted<{ id: string; deletedAt: string | null }>(
    { id: { eq: input.recordId } },
    'id deletedAt',
  );

  if (stored?.deletedAt !== null && stored?.deletedAt !== undefined) {
    await restoreWithNote(input);
  }
};
