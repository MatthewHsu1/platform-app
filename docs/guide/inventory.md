# Inventory

Warehouses and their locations, operation types, transfers with their moves and move lines,
stock levels per product, location, lot, package and owner, physical counts, scrap, returns,
backorders, multi-step routes and rules, putaway rules, storage categories, lots and serial
numbers with expiry dates, packages, consignment stock, reordering rules, batch and wave
transfers (design: `docs/superpowers/specs/2026-10-08-platform-inventory-design.md`).

## Modules

| Module | Holds |
| --- | --- |
| `src/stock/`, `src/stock-picking-batch/`, `src/product-expiry/`, `src/base/` | Inventory: warehouses, locations, operation types, transfers, moves, stock levels, counts, scrap, returns, backorders, routes and rules, putaway, storage categories, lots and serial numbers, expiry dates, packages, consignment, reordering rules, batch and wave transfers, reports, printing, the delivery signature. `src/base/` holds number sequences |

## Detail files

- [Variables](inventory/variables.md)
- [Screens, printing and reports](inventory/screens-and-printing.md)
- [Known limits and what is not included](inventory/limits.md)

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
and the rest of the list trim (see [Screens](inventory/screens-and-printing.md#screens)).

**The nightly stock check** compares each stock level with the sum of its done move lines. A
difference that is still there two minutes later, with no write in between, is fixed and a note
on the stock level says so.

**After a save.** As in [Products](products/after-a-save.md), rules run after the save: a change that is not allowed is put
back with a note ("Change undone", "Delete undone"); a refused new row is removed.

**Roles.** Inventory access is the Inventory and Products blocks on the Roles page (see [Roles and row access](roles-and-access.md)). Buttons that only a stock manager may use (Clear and Set to 0 on counts, Request a Count, Lock and Unlock, Relocate, the count conflict pop-up) need the right to update warehouses, which only Inventory Administrator has. Sign needs the right to update the transfer. An object a block does not list stays closed to it.
