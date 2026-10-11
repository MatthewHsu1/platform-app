# Platform

Our generic business app for Twenty, with a CRM, units of measure and a product catalog. Any company can install it. One folder per module under
`src/`. Design: `docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

| Module | Holds |
| --- | --- |
| `src/crm/` | Lead (`crmLead`): one record from first contact to won or lost; Type Lead or Opportunity, Won status, Salesperson (the row rule field), contact and customer, expected revenue, UTM links. Lost reason (`crmLostReason`). Buttons: Convert to opportunity, Mark won, Mark lost, Restore |
| `src/utm/` | Source, Medium, Campaign (`utmSource`, `utmMedium`, `utmCampaign`) |
| `src/uom/` | Units of measure (`uomUom`) with 30 default units |
| `src/product/` | Products (`productTemplate`), variants (`productProduct`), categories, tags, attributes and values, attribute lines, exclusions, packaging barcodes, vendor prices, pricelists and rules, combos |
| `src/row-access/` | Row access: the settings tab that picks the owner-only objects, their owner field and the roles that see every row. The rules are the `ROW_ACCESS_CONFIG` variable |
| `src/shared/install/` | The post-install hook |
| `src/roles/` | The role the logic functions and the settings page run with, and three roles for staff, assigned to nobody: Inventory User, Inventory Administrator, Products: Create (`inventory-role-table.ts` lists their rights per object) |

Later modules, each with its own design: Stock and parts orders, Work cases, Field
service.

The application universal id must equal the server constant
`SPIRIT_PLATFORM_APPLICATION_UNIVERSAL_IDENTIFIER`: the server reads the row access rules from
this app and allows rules on its objects.

## Three kinds of field

| Kind | Owner | Example |
| --- | --- | --- |
| Fixed field | The app. Code reads it | Won status, Type, Priority |
| Staff list | The workspace. The hook makes it once with default options; staff change options, colors and labels, and upgrades keep them | Stage, Tags |
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

## Products

Products, variants, attributes, pricelists, combos and units of measure (design:
`docs/superpowers/specs/2026-10-08-platform-products-design.md`).

**Not included:** `product.document` (every record has a Files tab), `company_id`, currency
conversion (the price code refuses to mix currencies), country groups on pricelists, settings
switches, per-category custom fields (add fields in Settings), chatter, label printing and
reports, and on-demand variants for Dynamically attributes (they come with Sales).

**After a save.** Triggers run after the save, so they do not block it:

- Variants appear a few seconds after a save, not at once. A product with no attributes has one
  variant, made for it.
- Where a change is not allowed, the app puts it back and adds a note on the record: "Change
  undone" (or "Delete undone" for a delete). A new row that is not allowed is removed.
- Deleting a product moves its variants, attribute lines, the product's attribute values (its
  template attribute values), exclusions, vendor prices and pricelist rules to the trash. Its
  tag, packaging and combo links are removed for good. The shared attribute values are not
  touched. Restoring the product from the trash gives it a new variant; its old variants,
  attribute lines, vendor prices and pricelist rules stay in the trash.
- A variant that a combo item uses cannot be deleted, and neither can a product with such a
  variant. The delete is undone and a note explains why.
- Deleting a combo choice moves its combo items to the trash and removes its combo links for good.
- Deleting a pricelist moves its rules to the trash. Deleting an attribute moves its values to the
  trash; it is refused while any attribute line names it, archived lines and lines of archived
  products too. Deleting a category moves its child categories, theirs, and its pricelist rules to
  the trash. Deleting a unit moves the units based on it, and theirs, to the trash with its
  packaging barcodes, and removes its product packaging links for good. It is refused while a
  product (archived too) or a vendor price uses the unit or one of those units. Products keep a
  deleted category; Twenty shows the field empty.
- Changing a product's type away from Combo removes its combo links. Twenty's update events
  carry only the fields that changed, so this runs when the type actually changes.
- A variant made by hand is removed for good with a note on the product: variants come from the
  attribute values. A variant restored from the trash is checked the same way.
- A barcode typed on a product is checked like one typed on its variant.
- Vendor price, pricelist rule and combo item names follow a rename of their product, variant or
  category.
- A sellable combo may only hold sellable products. A change that breaks this is put back with a
  note.
- Link rows (tags, packagings, attribute values on a line, exclusion values, combo links) are
  deleted for good when removed, so the same value can be added again. A refused new attribute
  line, exclusion, pricelist rule, combo item or variant is deleted for good, not moved to the
  trash. An exclusion made together with its refused value (within a few seconds) goes with it; an
  exclusion saved before stays, with no value.
- A big import runs at the app's API rate limit (Twenty allows an app 500 requests a minute,
  `APPLICATION_API_RATE_LIMITING_LIMIT`), about 150 products a minute. Raise it on the server
  for large imports.

**Validation rules.** The install hook makes Twenty validation rules (names start with
`platform-`): required names, required relations (for example an attribute line needs its product
and attribute), "a multi-checkbox attribute never makes variants", margin, date and vendor-price
checks, and the unit factor. Twenty only runs them when `IS_VALIDATION_RULES_ENABLED` is on for the
workspace, and the hook only makes them while it is on (rerun the install after turning it on).

- Local: insert the feature flag row, then restart the server and the worker (the flag is cached):
  `insert into core."featureFlag" (key,"workspaceId",value) values
  ('IS_VALIDATION_RULES_ENABLED','<workspaceId>',true)` on the `twenty` database, then
  `docker restart spirit-twenty-server-1 spirit-twenty-worker-1`.
- Production: the owner turns the flag on for the workspace. Never do it from app code.

**Field names staff must not add** to product objects (a later version may add them, and
the upgrade then stops): the names in the object files, for example `listPrice`, `standardPrice`,
`defaultCode`, `barcode`, `weight`, `volume`, `saleOk`, `purchaseOk`, `productType`, `categ`,
`uom`, `active`, `sequence`, `priceExtra`, `lstPrice`, `createVariant`, `displayType`,
`relativeFactor`, `completeName`.

## Rules for staff

- Add your own fields to our objects in Settings → Data model. Upgrades keep them. Do not give
  them one of those names: if a later version adds a field with the same name, the upgrade stops
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
