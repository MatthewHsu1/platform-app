# Roles and row access

Staff access is building blocks, one level per module, set on Platform's Roles page. Platform makes one Twenty role per mix of blocks and writes the row rules.

## Modules

| Module | Holds |
| --- | --- |
| `src/roles/` | Staff access: building blocks (Employee, Inventory User and Administrator, Products: Create, Sales: Own Documents, All Documents and Administrator; Work cases: Own Documents, All Documents and Administrator), the Roles page, and the sync that makes one Twenty role per mix of blocks and writes the row rules. Also the role the logic functions run with |

## Server settings

The application universal id is named in the server settings `OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` and `ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS` (twenty/compose.yaml): the server reads the row rules from this app, allows rules on its objects, and lets it write roles.

## Building blocks

A person's access is a set of **building blocks**, one level per module, set on Platform's
**Roles** page (Settings → Applications → Platform → Roles; Admin, or anyone whose role holds the Roles
permission). Employee is always included: it opens every object Platform does not own — Twenty's
own objects, objects admins make, and other apps' objects — with Twenty's Member rights in full
(read, edit, delete, destroy); Platform's own objects stay closed unless a block opens them.
Each module block opens that module's objects. Platform makes **one Twenty role per mix** (label like "Employee + Inventory
User + Sales: Own Documents"), gives it to the person, and deletes a mix nobody holds. Two people
with the same mix share its role. Rights add up across blocks; an object no block opens stays
closed.

| Module | Levels |
| --- | --- |
| Inventory | None, User, Administrator |
| Products | None, Create |
| Sales | None, Own Documents, All Documents, Administrator |
| Work cases | None, Own Documents, All Documents, Administrator |

## Detail files

- [Row rules](roles-and-access/row-rules.md): `all`, `mine`, `mineOrUnowned`, `ROW_ACCESS_CONFIG`
- [New people, mixed roles and release notes](roles-and-access/managing-roles.md)

## How it runs

- Buttons run as the clicking user (their role intersected with the app role), so the row
  rule applies: a rep cannot see or change another rep's lead. Each logic function checks the
  lead's state again; hiding a button is not a guard.
- A lead made by a person gets the creator as salesperson (the lead trigger). A lead made by an API key or by Platform itself has none: people with Sales: Own Documents see it, and anyone with a wider rule.
- Logic functions need `LOGIC_FUNCTION_TYPE=LOCAL` on the server and worker.
