# Field service

On-site jobs: a numbered service order at a service location, with a stage, a team, an assigned worker,
a planned window and an actual window. Locations sit in a tree and carry their equipment; workers belong to a
team and to territories; regions, districts, branches and territories make the service area tree.

## Modules

| Module | Holds |
| --- | --- |
| `src/fieldservice/` | Service order (`fsmOrder`), location, equipment, worker, team, order type, template and the links between them; the save rules and triggers; the install data, board and lists; the buttons Complete, Cancel order, Sign, Make a service location and Make a field service worker |
| `src/base-territory/` | Regions, districts, branches and territories |
| `src/fieldservice-crm/` | The service location of an opportunity, the opportunity of an order, and the Create service order button |
| `src/fieldservice-stock/` | Parts on a job: the warehouse, transfers, moves, stock references and delivery counts of an order; the stock location and shipping address of a location; the default warehouse of a worker and the warehouse of a territory |
| `src/fieldservice-equipment-stock/` | Equipment as a serial-numbered product: its product, serial and current inventory location, the equipment a done move makes, and the warranty length and unit of a product |
| `src/fieldservice-stage-validation/` | Stage rules (`fsmStageRule`): the fields an order needs before it moves into a stage, and the check that undoes a move while one is empty |
| `src/helpdesk-fieldservice/` | The work case link: the orders and the service location of a case, the resolution, the cases and count of a location, the primary service location of a contact or company, and the buttons Create service order (on a case) and Close work case (on an order) |
| `src/fieldservice-activity/` | The checklist of an order and of a template: activities, the Complete and Cancel buttons on an activity, and the guard on Complete |

## Detail files

- [After a save](field-service/after-a-save.md): numbering, team, schedule, holidays, stages, locations, equipment, deletes
- [Parts on a job](field-service/parts-on-a-job.md): warehouse, transfers, moves, stock locations
- [Equipment stock and warranty](field-service/equipment-stock.md): product, serial, inventory location, equipment made by a move, warranty from the product
- [Buttons, settings and access](field-service/buttons-settings-access.md)
- [The checklist](field-service/checklist.md): activities on an order and on a template

## Work case link

A work case has a Service location, a Resolution and a Service orders tab (number, location, closed status,
worker and planned window of each order). A contact or company has a Primary service location that new cases
start with. A service location shows its work cases and their count. Create service order on a case makes an
order for it. After the last order of an open case is completed or cancelled, Close work case on that order asks
for the stage and resolution of the case. The completed order does not ask by itself: Complete stays a one-click
button. See [after a save](field-service/after-a-save.md) and [buttons](field-service/buttons-settings-access.md).

## Screens

Orders and templates have an Activities tab. Field service folder in the sidebar: Service orders, Locations, Equipment, Workers, Teams, Order types,
Templates, Stage rules, Territories, Branches, Districts, Regions. The Service orders list also has the Orders board (by
stage) and the views To assign (open orders without a worker) and To schedule (open orders without a scheduled
start). Lists show at most 10 columns; staff can switch more on. The two views show the closed status but not
the stage: Twenty refuses a staff list as a column of a list the app makes, so staff add the Stage column by hand.

## Install

The install makes the order stage list (New, Completed, Cancelled), the same stage list on the stage rules, the
tag and category lists, the territory type list, the number series (`FO001`), the Default Team, the stock location Field, the board and the lists. It adds only what is
missing. No service areas are made: staff build their own.
