# New people, mixed roles and release notes

Part of [Roles and row access](../roles-and-access.md).

**New people** get Twenty's default role (Member) until an admin sets their levels. **Restrict
Member by hand** in Settings → Roles (no rights on Platform's objects): until then a new person has
Member's full rights on every object, Platform's included. Twenty does not let anyone change their
own role, so another admin sets yours. Admins keep Twenty's Admin role.

Twenty's Members page still works: an admin may pick a mixed role there, and the Roles page reads
it back into its levels. Building blocks are not roles and never show there.

Mixed roles are owned by the workspace's Custom application, so they are ordinary workspace roles: an admin can edit a mixed role's rights by hand in Settings → Roles, and Platform's next sync (any save on the Roles page, the install, the daily job) puts them back. Uninstalling Platform leaves the mixed roles and their holders as they are; delete them by hand if you uninstall.

A building block that a later Platform version removes leaves the roles that used it ignored by the sync. Their holders see only their own records on ruled objects until an admin saves them again on the Roles page.

**Release notes.** Production needs `TWENTY_ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS` and `TWENTY_OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` in `secrets/prod.env` before the new image runs. Nobody's role changes on release. The admin then restricts Twenty's Member role by hand (this closes Platform's objects to it) and sets each person's levels on the Roles page. Platform's own role needs no setting: the fork lets it see every row.
