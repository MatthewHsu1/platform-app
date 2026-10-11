import { twentyMetadata } from 'src/shared/twenty-graphql';

const FALLBACK_NAME = 'Warehouse';

// The warehouse and its code default to the workspace name (the workspace has
// no company record). If it cannot be read, "Warehouse".
export const readWorkspaceDisplayName = async () => {
  const response = await twentyMetadata<{ currentWorkspace: { displayName: string | null } | null }>(
    'application',
    `{ currentWorkspace { displayName } }`,
  );
  const name = response.data?.currentWorkspace?.displayName?.trim();

  return name !== undefined && name.length > 0 ? name : FALLBACK_NAME;
};
