import { type SnapshotMember } from 'src/roles/types/snapshot-member.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';

// platformObjectUniversalIdentifiers: the objects Platform's application owns in this workspace,
// read from the metadata, so an object added in a later version is closed with no code change.
export type RoleSyncSnapshot = {
  workspaceId: string;
  defaultRoleId: string;
  objectIdByUniversalIdentifier: Record<string, string>;
  fieldIdByUniversalIdentifier: Record<string, string>;
  platformObjectUniversalIdentifiers: string[];
  roles: SnapshotRole[];
  members: SnapshotMember[];
};
