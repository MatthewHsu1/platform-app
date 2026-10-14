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
| `src/fieldservice-activity/` | The checklist of an order and of a template: activities, the Complete and Cancel buttons on an activity, and the guard on Complete |

## Detail files

- [After a save](field-service/after-a-save.md): numbering, team, schedule, holidays, stages, locations, equipment, deletes
- [Buttons, settings and access](field-service/buttons-settings-access.md)
- [The checklist](field-service/checklist.md): activities on an order and on a template

## Screens

Orders and templates have an Activities tab. Field service folder in the sidebar: Service orders, Locations, Equipment, Workers, Teams, Order types,
Templates, Territories, Branches, Districts, Regions. The Service orders list also has the Orders board (by
stage) and the views To assign (open orders without a worker) and To schedule (open orders without a scheduled
start). Lists show at most 10 columns; staff can switch more on. The two views show the closed status but not
the stage: Twenty refuses a staff list as a column of a list the app makes, so staff add the Stage column by hand.

## Install

The install makes the order stage list (New, Completed, Cancelled), the tag and category lists, the territory
type list, the number series (`FO001`), the Default Team, the board and the lists. It adds only what is
missing. No service areas are made: staff build their own.
