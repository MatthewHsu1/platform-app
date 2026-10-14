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
| Close work case | one completed or cancelled order | User | Asks for a stage and a resolution and moves the order's work case there, once the case is open and all its orders are closed |

## Settings

Settings → Applications → Platform: the hours a new order may wait for each priority, and whether a new order
gets the equipment at its location.

## Access

Building blocks on the Roles page (see [Roles and row access](../roles-and-access.md)): Field service: User
(own documents), User, Dispatcher and Manager. No level filters orders by worker. Everyone with a level works
orders, locations, workers and order types; the dispatcher also deletes orders; nobody deletes locations; teams,
templates and equipment belong to the manager; every level keeps the service areas. Twenty has one right for
create and edit, so a level that edits a table may also add to it.

## Known limits

- Rules run just after the save, not inside it.
- A location keeps its own name, address and phone; it is not a contact. A location without a parent and
  without an owner stays without one.
- An order may be saved without a location, and stages carry no flags of their own: only Completed and
  Cancelled close an order.
- Work case link: completing the last order of a case does not open the Close work case dialog by itself; use the
  button on the order. The Service orders tab of a case shows the closed status of each order, not the stage
  (Twenty refuses a staff list as a column of a list the app makes). There is no case list filter for "has an
  open order": Twenty filters cannot test a condition inside a related list. The primary service location of a
  contact or company is set by hand; Make a service location does not set it. The new case fields are hidden
  columns of the case lists: staff switch them on.
- Not included: signature drawing, repair orders, serial number (lot) link, maps and route
  planning, per-worker row rule, stages for locations, equipment and workers, territory countries.
