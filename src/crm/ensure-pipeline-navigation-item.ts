import { readLeadObject } from 'src/crm/lead/read-lead-object';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const PIPELINE = 'Pipeline';
const CRM_FOLDER = 'CRM';

type NavigationItem = { id: string; name: string | null; type: string; folderId: string | null };

// The Pipeline board is made by the install hook, so the manifest cannot
// point a sidebar item at it. The item goes first in the CRM folder, and only
// while the folder has no item of that name.
export const ensurePipelineNavigationItem = async (): Promise<void> => {
  const items = requireData(
    await twentyMetadata<{ navigationMenuItems: NavigationItem[] }>(
      'application',
      'query NavigationItems { navigationMenuItems { id name type folderId } }',
    ),
    'Read the sidebar items',
  ).navigationMenuItems;
  const folder = items.find((item) => item.type === 'FOLDER' && item.name === CRM_FOLDER);

  if (folder === undefined) {
    throw new Error('The CRM folder is not in the sidebar.');
  }
  if (items.some((item) => item.folderId === folder.id && item.name === PIPELINE)) {
    return;
  }

  const object = await readLeadObject();
  const view = requireData(
    await twentyMetadata<{ getViews: { id: string; name: string }[] }>(
      'application',
      'query LeadViews($objectMetadataId: String) { getViews(objectMetadataId: $objectMetadataId) { id name } }',
      { objectMetadataId: object.id },
    ),
    'Read the lead views',
  ).getViews.find((candidate) => candidate.name === PIPELINE);

  if (view === undefined) {
    throw new Error('The Pipeline board does not exist yet.');
  }
  requireData(
    await twentyMetadata(
      'application',
      'mutation AddPipelineItem($input: CreateNavigationMenuItemInput!) { createNavigationMenuItem(input: $input) { id } }',
      { input: { type: 'VIEW', viewId: view.id, name: PIPELINE, icon: 'IconLayoutKanban', position: 0, folderId: folder.id } },
    ),
    'Add the Pipeline sidebar item',
  );
};
