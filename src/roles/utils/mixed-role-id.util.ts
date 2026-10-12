import { derivedId } from 'src/shared/utils/derived-id.util';

// The same mix always maps to the same role in a workspace. The workspace is part of it because a
// role id is unique across the whole server, and so that an id copied from another workspace's mix
// table never matches here. The parts are joined with ":", so a key holding one could make another
// key list's id.
export const mixedRoleId = (workspaceId: string, closedKeys: string[]) => {
  const joined = closedKeys.find((key) => key.includes(':'));

  if (joined !== undefined) {
    throw new Error(`A building block key cannot contain ":" (${joined}).`);
  }

  return derivedId('mixed-role', workspaceId, ...[...closedKeys].sort());
};
