# Field service: buttons, settings and access

Part of [Field service](../field-service.md).

## Buttons

Buttons run as the clicking person; each logic function checks its condition and the person's level again.

| Button | On | Needs | Does |
| --- | --- | --- | --- |
| Complete | one open order | User | Moves it to Completed, stamps the actual end now and the actual start when empty |
| Cancel order | one open order | Dispatcher | Moves it to Cancelled |
| Sign | one completed order | any level | Keeps the signer's name and the time, with a note; no drawn signature |
| Make a service location | one contact or company | Dispatcher | One location per partner; a contact's company owns it and the company's location becomes its parent |
| Make a field service worker | one contact | Dispatcher | One worker per contact |
| Create service order | one opportunity with a service location | User | An order there with the opportunity's description and priority, linked to it |
| Complete activity | one activity of an order, still to do | User | Marks it completed, with the time and the member (see [the checklist](checklist.md)) |
| Cancel activity | one activity of an order, still to do | User | Marks it cancelled |

## Settings

Settings → Applications → Platform: the hours a new order may wait for each priority, and whether a new order
gets the equipment at its location.

## Access

Building blocks on the Roles page (see [Roles and row access](../roles-and-access.md)): Field service: User
(own documents), User, Dispatcher and Manager. No level filters orders by worker. Everyone with a level works
orders, locations, workers and order types; the dispatcher also deletes orders; nobody deletes locations; teams,
templates and equipment belong to the manager; every level keeps the service areas. The checklist is for the User level and up (not User (own documents)); only the
manager deletes activities. Twenty has one right for
create and edit, so a level that edits a table may also add to it.

## Known limits

- Rules run just after the save, not inside it.
- A location keeps its own name, address and phone; it is not a contact. A location without a parent and
  without an owner stays without one.
- An order may be saved without a location, and stages carry no flags of their own: only Completed and
  Cancelled close an order.
- On an order the Complete and Cancel buttons of an activity sit on the activity (open it from the Activities tab),
  not on each row. A completed or cancelled activity can still be renamed. Scheduled to-dos of the order are not
  marked done when it completes.
- Not included: signature drawing, repair orders, serial number (lot) link, ticket link, maps and route
  planning, per-worker row rule, stages for locations, equipment and workers, territory countries.
