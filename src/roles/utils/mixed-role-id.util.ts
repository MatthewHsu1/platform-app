import { derivedId } from 'src/shared/utils/derived-id.util';

// The same mix always maps to the same role in a workspace. The workspace is part of it because a
// role id is unique across the whole server, and so that an id copied from another workspace's mix
// table never matches here.
export const mixedRoleId = (workspaceId: string, closedKeys: string[]) => derivedId('mixed-role', workspaceId, ...[...closedKeys].sort());
