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
| Create service order | one work case | User | An order for the case, with its service location (when it has one), priority and description as plain text, linked to it |
| Close work case | one completed or cancelled order | User | Asks for a stage and a resolution and moves the order's work case there, once the case is open and all its orders are closed. Complete opens the same panel by itself when it finishes the last open order of an open case |
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
- Work case link: the primary service location of a contact or company is set by hand; Make a service location
  does not set it. The service location and the resolution are hidden columns of the case lists that show ten
  columns already (My cases, Unassigned, SLA expired); staff switch them on. The stage column of the orders tab
  and these columns are added by the install, once, when the module first arrives.
- A person with the User level may also add activities, because Twenty has one right for create and edit; only the
  manager deletes them.
- A change to a completed or cancelled activity is undone just after the save, with a note, not refused.
- Not included: signature drawing, repair orders, maps and route
  planning, per-worker row rule, stages for locations, equipment and workers, territory countries.
