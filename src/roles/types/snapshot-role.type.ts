import { type MixedRoleSettings } from 'src/roles/types/mixed-role-settings.type';

// A Twenty role as the sync reads it. Null rights fall back to the role-wide setting.
export type SnapshotRole = Omit<MixedRoleSettings, 'description'> & {
  id: string;
  universalIdentifier: string | null;
  description: string | null;
  memberIds: string[];
  objectPermissions: {
    objectMetadataId: string;
    canReadObjectRecords: boolean | null;
    canUpdateObjectRecords: boolean | null;
    canSoftDeleteObjectRecords: boolean | null;
    canDestroyObjectRecords: boolean | null;
  }[];
  permissionFlags: string[];
  fieldPermissions: { objectMetadataId: string; fieldMetadataId: string; canReadFieldValue: boolean | null; canUpdateFieldValue: boolean | null }[];
};
