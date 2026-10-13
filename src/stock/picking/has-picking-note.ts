import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

// A step that adds a note checks it first, so a rerun after a stop does not add it twice.
export const hasPickingNote = async (pickingId: string, title: string) => {
  const data = requireData(
    await twentyGraphql<{ noteTargets: { edges: { node: { note: { title: string | null } | null } }[] } }>(
      'application',
      `query PickingNotes($filter: NoteTargetFilterInput) { noteTargets(filter: $filter, first: 200) { edges { node { note { title } } } } }`,
      { filter: { targetStockPickingId: { eq: pickingId } } },
    ),
    'Read transfer notes',
  );

  return data.noteTargets.edges.some((edge) => edge.node.note?.title === title);
};
