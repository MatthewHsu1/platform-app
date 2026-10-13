import { type MixedRoleSettings } from 'src/roles/types/mixed-role-settings.type';
import { type ObjectRightsFlags } from 'src/roles/types/object-rights-flags.type';

// One write on a mixed role, in the shape of Twenty's role API. An object list replaces the role's
// object rights; a field entry with nulls lifts a restriction.
export type RoleWrite =
  | { kind: 'role'; roleId: string; settings: MixedRoleSettings }
  | { kind: 'objects'; roleId: string; objectPermissions: ({ objectMetadataId: string } & ObjectRightsFlags)[] }
  | { kind: 'flags'; roleId: string; permissionFlagKeys: string[] }
  | {
      kind: 'fields';
      roleId: string;
      fieldPermissions: { objectMetadataId: string; fieldMetadataId: string; canReadFieldValue: false | null; canUpdateFieldValue: false | null }[];
    };
