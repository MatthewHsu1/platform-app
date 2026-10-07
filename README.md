# Platform

Our generic business app for Twenty, modelled on the reference ERP (LGPL-3; we copy the data
model and rules, not code). Any company can install it. One folder per the reference module under
`src/`. Design: `docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

| Module | Holds |
| --- | --- |
| `src/crm/` | Lead (`crmLead`): one record from first contact to won or lost; Type Lead or Opportunity, Won status, Salesperson (the row rule field), contact and customer, expected revenue, UTM links. Lost reason (`crmLostReason`). Buttons: Convert to opportunity, Mark won, Mark lost, Restore |
| `src/utm/` | Source, Medium, Campaign (`utmSource`, `utmMedium`, `utmCampaign`) |
| `src/row-access/` | Row access: the settings tab that picks the owner-only objects, their owner field and the roles that see every row. The rules are the `ROW_ACCESS_CONFIG` variable |
| `src/shared/install/` | The post-install hook |
| `src/roles/` | The role the logic functions and the settings page run with |

Later modules, each with its own design: Products, Stock and parts orders, Work cases, Field
service.

The application universal id must equal the server constant
`SPIRIT_PLATFORM_APPLICATION_UNIVERSAL_IDENTIFIER`: the server reads the row access rules from
this app and allows rules on its objects.

## Three kinds of field

| Kind | Owner | Example |
| --- | --- | --- |
| Fixed field | The app. Code reads it | Won status, Type, Priority |
| Staff list | The workspace. The hook makes it once with the reference's defaults; staff change options, colors and labels, and upgrades keep them | Stage, Tags |
| Lookup table | The app owns the table, staff own the rows | Source, Medium, Campaign, Lost reason |

Stage is for people (the board); Won status is for code. Mark won moves a lead to the stage
option `WON` only while staff keep it.

## The install hook

`definePostInstallLogicFunction`, run on install and on every upgrade. It only adds what is
missing and never changes what exists:

1. Staff lists that are missing on their object.
2. Default rows, only on the first install of 2.x (fresh, or over the 1.x app), so rows staff
   delete stay deleted.
3. Boards that are missing by name (the Pipeline board, grouped by Stage, hiding lost leads).
   Twenty v2.42+ lets an app token create views when its role has the Views flag.

The app role has the Data Model and Views permission flags for this, and Applications and
Roles for the row access page. It is not see-all.
Twenty refuses a SELECT or MULTI_SELECT with no options, so Tags starts with one option, Other.

## Row access

A signed-in user sees only the records they own on the objects an admin protects. Our Twenty
fork enforces the rule (`twenty/source`, module
`packages/twenty-server/src/engine/twenty-orm/spirit-row-access/`); Platform holds the settings
page and the rules. Design: `docs/superpowers/specs/2026-09-27-twenty-owner-row-access-design.md`
and `docs/superpowers/specs/2026-10-07-platform-row-access-design.md`.

- The rules are Platform's `ROW_ACCESS_CONFIG` variable (JSON, not secret). Installed value:
  `{"version":1,"rules":[],"seeAllRoleIds":[]}`, which filters nothing.
- The page is Platform's settings tab (Settings → Applications → Platform). It offers Company,
  Opportunity, Task, the workspace's own custom objects and Platform's objects (Lead) that have
  an owner field (a relation to a workspace member), and the roles that see every row. Admin
  always sees every row. Saving needs the Applications and Roles permissions.
- Row access is always on in the fork; there is no switch. Platform not installed, or no rule
  enabled: Twenty behaves as upstream. A saved value the server cannot read or validate hides
  every owner object from non-admins until an admin saves a valid one.
- The rules hold workspace ids (object, field, role), so they are set per workspace on the page.
- Uninstalling Platform deletes the rules with its objects: Twenty then behaves as upstream.

## Rules for staff

- Add your own fields to our objects in Settings → Data model. Upgrades keep them. Do not give
  them an the reference field name: if a later version adds a field with the same name, the upgrade stops
  until you rename yours.
- **Uninstalling the app deletes its objects with every staff field, staff list and board on
  them.** A reinstall brings back only the defaults.

## How it runs

- Buttons run as the clicking user (their role intersected with the app role), so the row
  rule applies: a rep cannot see or change another rep's lead. Each logic function checks the
  lead's state again; hiding a button is not a guard.
- A lead made by a user gets the creator as salesperson (fork behaviour). A lead made by an API
  key has none: only admins and see-all roles see it until someone sets it.
- Logic functions need `LOGIC_FUNCTION_TYPE=LOCAL` on the server and worker.

## Build and test

Node 24 (`.nvmrc`), from this folder:

```bash
yarn install --immutable
yarn lint && yarn typecheck && yarn test
yarn twenty dev:build --tarball   # .twenty/output/platform-<version>.tgz
```

The server's row access integration specs install that tarball. They find it through
`SPIRIT_PLATFORM_APP_DIR`, or by default in this folder's `.twenty/output`. Run them with
`SERVER_URL=http://localhost:4000`, so the install hook reaches the test server.

## Publish

Each publish needs a higher `version` in `package.json`; an equal one is refused.

```bash
yarn twenty remote:add --api-key <ADMIN_API_KEY> --url <SERVER_URL> --as <remote>
yarn twenty app:publish --private -r <remote>
yarn twenty app:install -r <remote>
```

## Upgrade from the Spirit app (1.x)

Needs our Twenty image v2.45.6-spirit.1 or later: older images read the rules from the retired
row-access app. The upgrade deletes the old Lead and Lead Source tables. Production held no real
lead data (2026-10-06).

1. Publish and install the new version. The hook makes Stage, Tags, the default rows and the
   Pipeline board.
2. On Platform's settings tab, set the row rule on Lead (`crmLead`), owner field Salesperson, and
   any other rules the workspace had in the row-access app.
3. Uninstall the row-access app.
4. Hide Twenty's built-in Opportunity (Settings → Data model).
