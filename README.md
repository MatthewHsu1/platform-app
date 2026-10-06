# Platform

Our generic business app for Twenty, modelled on the reference ERP (LGPL-3; we copy the data
model and rules, not code). Any company can install it. One folder per the reference module under
`src/`. Design: `docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

| Module | Holds |
| --- | --- |
| `src/crm/` | Lead (`crmLead`): one record from first contact to won or lost; Type Lead or Opportunity, Won status, Salesperson (the row rule field), contact and customer, expected revenue, UTM links. Lost reason (`crmLostReason`). Buttons: Convert to opportunity, Mark won, Mark lost, Restore |
| `src/utm/` | Source, Medium, Campaign (`utmSource`, `utmMedium`, `utmCampaign`) |
| `src/shared/install/` | The post-install hook |
| `src/roles/` | The role the logic functions run with |

Later modules, each with its own design: Products, Stock and parts orders, Work cases, Field
service.

The application universal id must equal the server constant
`SPIRIT_ROW_ACCESS_OWN_APPLICATION_UNIVERSAL_IDENTIFIERS` and the row-access app's
`OWN_APPLICATION_UNIVERSAL_IDENTIFIERS`: it is how a row rule may sit on Lead.

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
   Twenty 2.41 refuses `createView` to every app token (its view guard reads only users and API
   keys), so today the hook skips the board and logs `Install: board "Pipeline" was not made`.
   Make it by hand once: Leads → new view → Kanban, group by Stage, filter Won status is not Lost.

The app role has the Data Model and Views permission flags for this. It is not see-all.
Twenty refuses a SELECT or MULTI_SELECT with no options, so Tags starts with one option, Other.

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

## Publish

Each publish needs a higher `version` in `package.json`; an equal one is refused.

```bash
yarn twenty remote:add --api-key <ADMIN_API_KEY> --url <SERVER_URL> --as <remote>
yarn twenty app:publish --private -r <remote>
yarn twenty app:install -r <remote>
```

## Upgrade from the Spirit app (1.x) to 2.0.0

The upgrade deletes the old Lead and Lead Source tables. Production held no real lead data
(2026-10-06).

1. Remove the row rule on the old Lead on the row-access settings page. If you skip this, the
   upgrade still passes, but the rule now names a deleted object, so the server fails closed:
   every non-admin sees no companies, opportunities or leads until the rule is removed.
2. Publish and install 2.0.0. The hook makes Stage, Tags and the default rows. Make the Pipeline
   board by hand (see [The install hook](#the-install-hook)).
3. Set the row rule on Lead (`crmLead`), owner field Salesperson.
4. Hide Twenty's built-in Opportunity (Settings → Data model).
