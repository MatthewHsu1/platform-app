import { records } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

// A note attaches to a record through a target field named after the object.
const noteTargetFieldName = (objectSingular: string) => `target${capitalize(objectSingular)}Id`;

export const addNote = async ({
  objectSingular,
  recordId,
  title,
  body,
}: {
  objectSingular: string;
  recordId: string;
  title: string;
  body: string;
}) => {
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
