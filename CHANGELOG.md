# Changelog

All notable changes to this application are documented in this file.

## 2.6.0 (unreleased)

- Field service: numbered service orders (`FO001`) at a service location, with a stage (New, Completed,
  Cancelled; staff add their own), a team, an assigned worker and extra workers, a planned window and an
  actual window, a request window by priority, equipment, a template, a type, tags and categories. After each
  save the schedule, team, directions, instructions, closed status, actual duration and service area are kept
  right; a manual move to Completed, a start on a holiday (time off of the working hours) and a delete outside
  New are undone with a note.
- Service locations in a tree with full names and directions, owners, workers, office hours and counts of
  sub-locations and equipment; equipment with a service area and a warranty end; workers with a team, a working
  schedule and territories; teams with open, to-assign and to-schedule counts; regions, districts, branches and
  territories.
- Buttons: Complete, Cancel order and Sign on an order; Make a service location on a contact or company; Make a
  field service worker on a contact; Create service order on an opportunity.
- Install: the order stages, the `FO` number series, the Default Team, the Orders board and the To assign and To
  schedule lists. Settings: the hours an order may wait by priority, and equipment fill on new orders.
- The building blocks Field service: User (own documents), User, Dispatcher and Manager on the Roles page.
- Parts on a job: a service order has a warehouse (the worker's default warehouse, else the first one), the
  transfers and moves made for it, stock references, and counts of its deliveries and returns; a service
  location has a stock location (its parent's, else the customer location of its contact or company, else
  Customers) and a shipping address; a worker has a default warehouse and a territory has a warehouse. A move
  takes the order of its transfer. The virtual location Field is made on install.
- Equipment as a serial-numbered product: equipment has a product, a serial and its current inventory location
  (where the newest stock of the serial is); the serial lists its equipment. A product and an operation type can
  both be set to create equipment: a done move then makes one equipment for each serial it moved, at the
  location of its service order. A product has a warranty length and unit; its equipment shows them, and the
  warranty end follows them.
- Stage rules: a rule row lists the order fields a stage needs (team, location, description, assigned to, scheduled
  window, instructions, resolution, actual window, signature, template, type). A move into the stage while one is
  empty is undone with a note, and the Complete and Cancel buttons refuse with the same text. Manager edits the
  rules; the stage list on a rule is made on install and staff keep it in line with the order's.

## 2.5.0 (unreleased)

- Work cases: numbered customer cases (`HT00001`) with a team, assignee, stage, priority, category, tags,
  type, product, contact and customer company. Teams with members, stages (with closed and unattended
  flags and team limits), categories in a tree, tags, types. After each save the number, assignee,
  team, stage, dates, company copy and the team's open counts are kept right; a stage that cases still
  use and an SLA policy that rows still use come back with a note when deleted.
- Service levels: SLA policies (days and hours, target stage, teams, categories, tags, a filter and
  stages that pause the clock) give each matching case a row with a deadline counted in working hours;
  the case shows its earliest deadline, and the SLA expired lists show late cases without a job.
- Working hours: weekly working times (one or two weeks, with a break), time off and a time zone;
  the standard 40-hour week is made on install.
- Buttons: Assign to me, Mark as duplicate, Duplicate, Create opportunity, Refresh SLA. Related cases
  link both ways; a case links to its opportunities.
- A Work cases settings page (assign to creator, duplicate tracking, duplicate stage) and the building
  blocks Work cases: Own Documents, All Documents and Administrator on the Roles page. Own Documents
  sees the cases assigned to the person and the cases nobody holds.

## 2.4.1 (unreleased)

- Printouts: only the transfer keeps a Printouts field now. It holds the signed delivery slip. The
  field is gone from moves, locations, operation types, lots, packages, package history, package
  types, batches, products, variants and units. No code ever wrote files there. Prints are still
  one-time pages and save nothing.

## 2.4.0 (unreleased)

- Roles: building blocks per module (Employee; Inventory User and Administrator; Products:
  Create; Sales: Own Documents, All Documents, Administrator) set on the new Roles page. Platform
  makes one Twenty role per mix of blocks, gives it to the person, rebuilds it on every install and
  daily, and deletes mixes nobody holds. The three Inventory roles of 2.3.0 are now blocks.
- Row access: rules come from the blocks, per role and per object (`all`, `mine`,
  `mineOrUnowned`); a create or edit must stay inside the person's rule. The row access settings
  page is gone, and so are the see-all role list and the rules on Twenty's Company, Opportunity
  and Task. Platform's own role sees every row.
- Needs the Twenty image with the `owner-row-access` module and the two settings
  `OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` and `ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS`
  (in production `TWENTY_OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER` and
  `TWENTY_ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS` in `secrets/prod.env`).
  Upgrade the image and Platform together: until Platform's install writes the new rules, members
  see no rows of ruled objects. Release day changes nobody's role: restrict Member by hand, then
  set each person's levels on the Roles page.
- Mixed roles belong to the workspace's Custom application: an admin can edit one by hand and the
  next sync puts it back; uninstalling Platform leaves them.
- CRM stages are records with won stages, folding, rotting and team limits; the Pipeline board
  has one column per stage. The upgrade replaces the old Stage list (no lead data is kept).
- Save rules after each lead save: stage date, won stage at 100 %, closed date, assignment date,
  team from the salesperson, prorated and recurring revenue, phone and email quality, rotting,
  contact email and phone both ways. A lead in a won stage below 100 % is refused and undone with
  a note.
- Sales teams and members, recurring plans, UTM stages and tags, campaign stage and tags.
- Buttons: Use automatic probability, Convert many, Merge, Similar leads; Mark lost for many
  leads with a closing note; Restore keeps the closed date when the probability stays 0.
- Lead assignment by rules, on a schedule or by button, with plug point `crm.assignment.v1`.
- Predictive lead scoring with live counts, "Update probabilities" and a nightly rebuild (off);
  the Probability tab explains a lead's score.
- Rotting opportunities: a flag and days on each lead, a daily refresh and the Rotting list.
- CRM settings page (Settings → Apps → Platform → CRM), saved by workspace administrators.
- Screens: CRM and UTM folders, My pipeline board, counters on teams and members, a Leads tab on
  companies.
- Release: turn on `IS_VALIDATION_RULES_ENABLED` before installing.

## 2.3.0 (unreleased)

- Inventory: warehouses, locations, operation types, transfers, moves and move lines, stock
  levels, physical counts, scrap, returns and backorders; multi-step routes and rules, putaway
  rules and storage categories; lots and serial numbers with expiry dates; packages and
  consignment; reordering rules and the replenishment list; batch and wave transfers.
- Stock levels change by compare-and-set and buttons that change stock take a claim, so two
  people validating at once move the stock once. A daily job reserves, reorders, checks the stock
  against the done moves and resumes stopped runs.
- Screens: the Inventory menu, tabs on Twenty's record pages, the Overview, lists of at most 10
  columns, saved views and the Moves Analysis page. Reports: forecast, inventory at date,
  traceability, reception allocation, product routes.
- Printing as printable pages and ZPL downloads; automatic print links at Validate; product, lot,
  location, operation type, package and packaging labels; delivery signature with the signed
  delivery slip saved on the transfer.
- Three member roles ship with the app, assigned to nobody: Inventory User, Inventory
  Administrator, Products: Create.
- Screen text is translatable (`locales/`, English for now).

## 2.2.0

- Products and units of measure: products and their variants, attributes and
  values, categories, tags, units of measure (30 default units), packaging barcodes, vendor
  prices, pricelists and combos.
- Save rules run after each save. Variants appear a few seconds after a save. A refused
  change is undone with a note ("Change undone" or "Delete undone"); a refused new row is removed.
- Deleting a product moves its variants, attributes, vendor prices and pricelist rules to the
  trash; so does deleting a pricelist (its rules), an attribute (its values), a
  category (its child categories and rules) or a unit (the units based on it, its packaging
  barcodes and packaging links). An attribute any attribute line names, and a unit a product or
  vendor price uses, cannot be deleted.
- Turn on `IS_VALIDATION_RULES_ENABLED` for the workspace for the field checks: required names and
  relations, margins, dates, and "a multi-checkbox attribute never makes variants". Without the
  flag the app still undoes what its triggers can see, but Twenty accepts incomplete rows.

## 2.1.1

- The row access settings page no longer crashes with "Cannot use 'in' operator to search for
  'composedPath'" when the pointer or focus reaches a section description.

## 2.1.0

- Row access is part of Platform: its settings tab chooses the owner-only objects, their owner
  field and the roles that see every row. The separate row-access app is retired.
- Platform's role adds the Applications and Roles permissions for that page.

## 2.0.0

- The app is now "Platform", our generic business app. It replaces the previous 1.x app (same universal id).
- CRM: Lead (`crmLead`, lead and opportunity in one record), Lost reason, and the buttons
  Convert to opportunity, Mark won, Mark lost and Restore.
- UTM: Source, Medium and Campaign, with default rows.
- A post-install hook makes the staff lists Stage and Tags and the Pipeline board.
- Removed: Lead and Lead Source of 1.x, Meta intake, and conversion to Twenty's Opportunity.
  The upgrade deletes their tables.

## 1.0.1

- Convert shows a success or error message and opens the new opportunity. An error no
  longer leaves the button dead until the page reloads.

## 1.0.0

- Lead and Lead Source objects, Meta intake, Convert to opportunity.
