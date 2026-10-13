import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const BOARD = 'Cases board';
const FOLDER = 'Work cases';

type NavigationItem = { id: string; name: string | null; type: string; folderId: string | null };

// The cases board is made by the install hook, so the manifest cannot point a sidebar item at it. The item goes
// first in the Work cases folder, and only while the folder has no item of that name.
export const ensureCasesBoardNavigationItem = async (): Promise<void> => {
  const items = requireData(
    await twentyMetadata<{ navigationMenuItems: NavigationItem[] }>(
      'application',
      'query NavigationItems { navigationMenuItems { id name type folderId } }',
    ),
    'Read the sidebar items',
  ).navigationMenuItems;
  const folder = items.find((item) => item.type === 'FOLDER' && item.name === FOLDER);

  if (folder === undefined) {
    throw new Error('The Work cases folder is not in the sidebar.');
  }
  if (items.some((item) => item.folderId === folder.id && item.name === BOARD)) {
    return;
  }
  const object = requireData(
    await twentyMetadata<{ objects: { edges: { node: { id: string } }[] } }>(
      'application',
      `query CaseObject($universalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) { edges { node { id } } }
      }`,
      { universalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the work case object',
  ).objects.edges[0]?.node;

  if (object === undefined) {
    throw new Error('The work case object does not exist yet.');
  }
  const view = requireData(
    await twentyMetadata<{ getViews: { id: string; name: string }[] }>(
      'application',
      'query CaseViews($objectMetadataId: String) { getViews(objectMetadataId: $objectMetadataId) { id name } }',
      { objectMetadataId: object.id },
    ),
    'Read the work case views',
  ).getViews.find((candidate) => candidate.name === BOARD);

  if (view === undefined) {
    throw new Error('The cases board does not exist yet.');
  }
  requireData(
    await twentyMetadata(
      'application',
      'mutation AddBoardItem($input: CreateNavigationMenuItemInput!) { createNavigationMenuItem(input: $input) { id } }',
      { input: { type: 'VIEW', viewId: view.id, name: BOARD, icon: 'IconLayoutKanban', position: 0, folderId: folder.id } },
    ),
    'Add the cases board sidebar item',
  );
};
