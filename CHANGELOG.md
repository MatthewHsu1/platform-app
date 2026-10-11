# Changelog

All notable changes to this application are documented in this file.

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

- The app is now "Platform", our generic business app. It replaces the Spirit app (same universal id).
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
