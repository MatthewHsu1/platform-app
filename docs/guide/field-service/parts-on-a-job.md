# Field service: parts on a job

Part of [Field service](../field-service.md). Links service orders to the [Inventory](../inventory.md) module.

Triggers run after the save, so the values below appear a few seconds after a save. A refused change is undone
with a note on the record.

## On an order

- Warehouse: every order has one. A new order takes the default warehouse of its worker, else the oldest
  active warehouse. With no warehouse at all, the new order is removed again (the function's log says why).
  Picking a worker later fills the worker's default warehouse, unless the same save sets the warehouse or the
  order is Completed. A warehouse staff clear is put back with a note; an older order without one gets the
  default on its next save.
- Transfers: a transfer names the order it was made for. The order lists its transfers and its stock
  references. Its Inventory tab shows the moves of its deliveries and returns (Operations; moves of internal
  transfers are left out) and the service location as a card that opens into the location's fields, among
  them its stock location.
- Delivery orders and Return orders: counts of the order's transfers whose operation type is a delivery or a
  receipt. An internal transfer counts in neither; cancelled transfers count.
- A move takes the order of the transfer it sits in: when the move is made, moved into another transfer, or
  when the transfer's order changes. Taking the order off a transfer leaves its moves as they are.
- A deleted order leaves the transfers and moves that name it and loses its stock reference links.

## On a location, a worker and a territory

- Stock location of a service location: where its goods are. A new location takes its parent's, else the
  customer location of the contact or company it was made from, else Customers. Moving a location under a
  new parent gives it the parent's stock location. When a location's stock location changes, every location
  below it takes the new one, one set by hand included. A location cleared of it is filled the same way.
- Shipping location: a contact or a company.
- Default warehouse of a worker, and Warehouse of a territory. A deleted warehouse leaves both.

## Deletes

A warehouse that orders use and a stock location that service locations use cannot be deleted: the delete
comes back with a note.

## Install

The virtual location Field is made once with the module.

## Known limits

- A move made by a stock rule does not take an order of its own: only a move in a transfer of the order does.
- A person sees the warehouse, transfers and moves of an order only with the rights to read them: give the
  Inventory level next to the Field service level.
