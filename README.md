# Platform

Our generic business app for Twenty, with a CRM, units of measure and a product catalog. Any company can install it. One folder per module under
`src/`. Design: `docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

| Module | Holds |
| --- | --- |
| `src/crm/` | Lead (`crmLead`): one record from first contact to won or lost; Type Lead or Opportunity, Won status, Salesperson (the row rule field), contact and customer, expected revenue, UTM links. Lost reason (`crmLostReason`). Buttons: Convert to opportunity, Mark won, Mark lost, Restore |
| `src/utm/` | Source, Medium, Campaign (`utmSource`, `utmMedium`, `utmCampaign`) |
| `src/uom/` | Units of measure (`uomUom`) with 30 default units |
| `src/product/` | Products (`productTemplate`), variants (`productProduct`), categories, tags, attributes and values, attribute lines, exclusions, packaging barcodes, vendor prices, pricelists and rules, combos |
| `src/stock/`, `src/stock-picking-batch/`, `src/product-expiry/`, `src/base/` | Inventory: warehouses, locations, operation types, transfers, moves, stock levels, counts, scrap, returns, backorders, routes and rules, putaway, storage categories, lots and serial numbers, expiry dates, packages, consignment, reordering rules, batch and wave transfers, reports, printing, the delivery signature. `src/base/` holds number sequences |
| `src/shared/install/` | The post-install hook |
| `src/roles/` | Staff access: building blocks (Employee, Inventory User and Administrator, Products: Create, Sales: Own Documents, All Documents and Administrator), the Roles page, and the sync that makes one Twenty role per mix of blocks and writes the row rules. Also the role the logic functions run with |

Later modules, each with its own design: Sales, Purchase, Work cases, Field service.

The application universal id is named in the server settings `OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` and `ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS` (twenty/compose.yaml): the server reads the row rules from this app, allows rules on its objects, and lets it write roles.

## Three kinds of field

| Kind | Owner | Example |
| --- | --- | --- |
| Fixed field | The app. Code reads it | Won status, Type, Priority |
| Staff list | The workspace. The hook makes it once with default options; staff change options, colors and labels, and upgrades keep them | Stage, Tags |
| Lookup table | The app owns the table, staff own the rows | Source, Medium, Campaign, Lost reason |

Stage is for people (the board); Won status is for code. Mark won moves a lead to the stage
option `WON` only while staff keep it.

## The install hook

`definePostInstallLogicFunction`, run on install and on every upgrade. Apart from the last step
below, it only adds what is missing and never changes what exists:

1. Staff lists that are missing on their object.
2. Default rows, only on the first install of 2.x (fresh, or over the 1.x app), so rows staff
   delete stay deleted.
3. Boards that are missing by name (the Pipeline board, grouped by Stage, hiding lost leads).
   Twenty v2.42+ lets an app token create views when its role has the Views flag.
4. Rebuilds the mixed roles from the building blocks, deletes the ones nobody holds, and writes
   the row rules.

The app role has the Data Model and Views permission flags for this, and Applications and Roles for the roles sync. The server lets it read every row.
Twenty refuses a SELECT or MULTI_SELECT with no options, so Tags starts with one option, Other.

## Roles and row access

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

**Row rules.** Each block may limit which rows of an object a person sees: `all`, `mine` (they are
the owner) or `mineOrUnowned` (they are the owner, or nobody is). A mix joins its blocks' rules on
each object and the widest wins; a block with no rule there does not widen it. Today: Lead
(owner field Salesperson) — Sales: Own Documents sees their own and unowned leads, All Documents
and Administrator see all. A person may create or change a row only so that it stays inside their
rule: a rep cannot give a lead to someone else. Admin and Platform's own role see every row. Any
other role (Twenty's Member, a role made by hand, an API key's role) sees only its own rows on a
ruled object. Twenty's own Company, Opportunity and Task have no rule.

The rules are Platform's `ROW_ACCESS_CONFIG` variable, written by Platform on every Roles page
save, install and daily run; do not edit it. Our Twenty fork enforces them (module
`packages/twenty-server/src/engine/twenty-orm/owner-row-access/` in `twenty/source`). A value the
server cannot read hides ruled objects from everyone but Admin and Platform until the next run
writes a good one. Platform not installed: no rules, Twenty behaves as upstream.

**New people** get Twenty's default role (Member) until an admin sets their levels. **Restrict
Member by hand** in Settings → Roles (no rights on Platform's objects): until then a new person has
Member's full rights on every object, Platform's included. Twenty does not let anyone change their
own role, so another admin sets yours. Admins keep Twenty's Admin role.

Twenty's Members page still works: an admin may pick a mixed role there, and the Roles page reads
it back into its levels. Building blocks are not roles and never show there.

Mixed roles are owned by the workspace's Custom application, so they are ordinary workspace roles: an admin can edit a mixed role's rights by hand in Settings → Roles, and Platform's next sync (any save on the Roles page, the install, the daily job) puts them back. Uninstalling Platform leaves the mixed roles and their holders as they are; delete them by hand if you uninstall.

A building block that a later Platform version removes leaves the roles that used it ignored by the sync. Their holders see only their own records on ruled objects until an admin saves them again on the Roles page.

**Release notes.** Production needs `TWENTY_ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS` and `TWENTY_OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` in `secrets/prod.env` before the new image runs. Nobody's role changes on release. The admin then restricts Twenty's Member role by hand (this closes Platform's objects to it) and sets each person's levels on the Roles page. Platform's own role needs no setting: the fork lets it see every row.

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

## Inventory

Warehouses and their locations, operation types, transfers with their moves and move lines,
stock levels per product, location, lot, package and owner, physical counts, scrap, returns,
backorders, multi-step routes and rules, putaway rules, storage categories, lots and serial
numbers with expiry dates, packages, consignment stock, reordering rules, batch and wave
transfers (design: `docs/superpowers/specs/2026-10-08-platform-inventory-design.md`).

**Stock levels.** A done move line adds to or takes from the stock level of its source and
destination. Each stock level row carries a version; a write only lands when the version is
still the one read (compare-and-set), so two runs never lose an update. Reserved quantities are
summed again from the open move lines after each change. Stock may go negative.

**Buttons that change stock** (Validate, also on a batch; Mark as Todo, Return, Scrap, Apply
counts, Relocate, Allocation) first take a claim on the record. A second click while the first run
works answers "This record is being processed. Try again in a moment." A run that stopped half
way (server restart) is resumed by the next click on the same record after 15 minutes, or by the
daily job.

**The daily job** (once a day, as the app): reordering rules, reservations whose date has come,
lot expiry alerts, removal of empty stock rows, the nightly stock check, resuming stopped runs,
and the rest of the list trim (see Screens).

**The nightly stock check** compares each stock level with the sum of its done move lines. A
difference that is still there two minutes later, with no write in between, is fixed and a note
on the stock level says so.

**After a save.** As in Products, rules run after the save: a change that is not allowed is put
back with a note ("Change undone", "Delete undone"); a refused new row is removed.

**App variables** (Settings → Applications → Platform → Variables, admin only):

| Variable | Default | Meaning |
| --- | --- | --- |
| `ANNUAL_INVENTORY_MONTH`, `ANNUAL_INVENTORY_DAY` | 12, 31 | Yearly count date (month 0: no yearly count) |
| `REPLENISHMENT_HORIZON_DAYS` | 365 | How far reordering rules look ahead |
| `SHOW_EXPECTED_QUANTITY_COUNT` | off | Print the quantity on hand on count sheets |
| `PRODUCT_UNIT_DIGITS` | 2 | Decimals of quantities |

**Roles.** Inventory access is the Inventory and Products blocks on the Roles page (see "Roles and row access"). Buttons that only a stock manager may use (Clear and Set to 0 on counts, Request a Count, Lock and Unlock, Relocate, the count conflict pop-up) need the right to update warehouses, which only Inventory Administrator has. Sign needs the right to update the transfer. An object a block does not list stays closed to it.

**Screens.** Record pages are Twenty's own page with every field on the left; the app adds tabs
for related lists and reports. Inventory lists open with at most 10 columns; the other fields are
hidden columns staff can switch on. On install the app hides all but 10 columns of each object's
"All" list once; a column staff show again stays shown. A fresh install finishes the trim within
a day (the daily job carries on where the install stopped). Counts on the Overview open saved
views of the list. Status buttons on a transfer open one record. Physical Inventory and My
Counts sort by location only.

**Printing.** A Print command gives a link that opens a printable page in a new browser tab
(barcodes drawn on the page); print it from the browser. ZPL labels download as a `.zpl` file. A
link works once and for 10 minutes. Nothing is saved, except the signed delivery slip, which is
kept on the transfer. Operation types can offer slips and labels automatically at Validate, only
for a Validate a person makes (a Validate the daily job resumes shows no links). Labels: Print
Labels on products and transfers.

**Delivery email.** The app sends none. An admin can build a Twenty workflow: Record is Updated on
Transfers, state Done on a delivery, then Send Email from a connected mailbox. The workflow fires
on transfers the app sets to Done, and its To field can use the contact person's email. A
workspace needs a connected mailbox to send; the first test of this workflow, on a workspace with
none, sent nothing.

**Reports.** Inventory → Overview, Moves Analysis (a page with charts and the done moves);
Forecasted (products, moves, reordering rules), Inventory at Date (product variants, opened from
the variant list, pages of 80 with search), Traceability (lots, done transfers), Allocation
(receipts), Product Routes Report (products).

**Translations.** Screen text is translatable (`locales/`); English only for now. Refresh the
catalog with `yarn twenty dev:translations-extract` after adding text. Record data (names,
descriptions) is one language for everyone.

**Known limits.**

- Inventory is one flat menu folder.
- List views are not grouped by warehouse, location or product, and a saved view keeps one sort
  key.
- Buttons on a selection act on the ticked rows only; select-all is refused.
- The note on a signed slip names the file and links the record.
- Messages from logic functions are English only.
- Sign is still offered on a delivery that is already signed; the pop-up then says so.
- A Locations filter on warehouse reads "Location: NotEmpty", and the Late views read "Past
  36500 days"; the queries behind them are right.

**Not included:** `company_id` and several companies in one workspace, stock valuation and
landed costs (with Purchase), delivery carriers (with Sales), barcode scanning screens, GS1
barcodes (SSCC package labels are built), per-type custom fields, pivot views, partner languages
on printed documents.

## Rules for staff

- Add your own fields to our objects in Settings → Data model. Upgrades keep them. Do not give
  them one of those names: if a later version adds a field with the same name, the upgrade stops
  until you rename yours.
- Deleting or deactivating the Tags or Language field on leads turns those scoring factors off;
  the lead rules go on without them.
- **Uninstalling the app deletes its objects with every staff field, staff list and board on
  them.** A reinstall brings back only the defaults.

## How it runs

- Buttons run as the clicking user (their role intersected with the app role), so the row
  rule applies: a rep cannot see or change another rep's lead. Each logic function checks the
  lead's state again; hiding a button is not a guard.
- A lead made by a person gets the creator as salesperson (the lead trigger). A lead made by an API key or by Platform itself has none: people with Sales: Own Documents see it, and anyone with a wider rule.
- Logic functions need `LOGIC_FUNCTION_TYPE=LOCAL` on the server and worker.

## Build and test

Node 24 (`.nvmrc`), from this folder:

```bash
yarn install --immutable
yarn lint && yarn typecheck && yarn test
yarn twenty dev:build --tarball   # .twenty/output/platform-<version>.tgz
```

The server's row access integration specs install that tarball. They find it through
`OWNER_ROW_ACCESS_APP_DIR`, or by default in this folder's `.twenty/output`. Run them with
`SERVER_URL=http://localhost:4000` and `OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER=39a89e81-0862-4929-a8ae-7a897d52f0a3`, so the install hook reaches the test server.

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
