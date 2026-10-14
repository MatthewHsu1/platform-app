# Field service: equipment stock and warranty

Part of [Field service](../field-service.md). Links equipment to the [Products](../products.md) and
[Inventory](../inventory.md) modules.

Triggers run after the save, so the values below appear a few seconds after a save.

## Product and serial

- Equipment has a Product and a Serial # (a lot of that product). Both are optional. A serial lists the
  equipment that names it. Only one live equipment can hold a serial, and the serial must belong to the
  product (see below).
- Current inventory location: the location of the newest stock of the serial. Newest is the latest incoming
  date, then the latest creation. Stock that is gone is not counted, so a serial with no stock has no location.
  Only the app writes it: it follows the serial when equipment is made or its serial changes, and when the
  location of the serial changes.

A save that gives equipment a serial of another product, or a serial another live equipment holds, is undone
with a note: a new equipment loses its serial, a changed one gets its old product and serial back. Trashed
equipment do not hold a serial. Of two new equipment with one serial, the older keeps it. Equipment made by the
app is not checked: it takes a serial that has no equipment.

## Equipment made by a move

A product has the switch Create equipment, and so has an operation type. When a move of that product in a
transfer of that type is done, the app makes one equipment for each serial the move carried. A serial that
already has equipment makes no new one. The equipment is named `<product> <serial>`, takes the product and the
serial, and takes the location of the service order of the move as its location and its current location (no
order: no location).

## Warranty

- A product has a warranty length (a whole number) and a unit (days, weeks, months or years; months by default).
- Equipment shows the length and unit of its product. It copies them when the product is set or changed, and
  when the product changes them. Staff cannot type them on the equipment. With no product they show no length.
- The warranty start is today when empty. The warranty end follows the start and the length and unit of the
  product (no length: today), unless staff set it. An end before the start is refused: see
  [After a save](after-a-save.md).

## Known limits

- Product and serial are not required on equipment.
- The serial check runs after the save, so the save shows for a few seconds before it is undone.
- The Serial # picker lists every serial, not only the product's; a wrong pick is undone.
- A change of the product's warranty sets the end again on all its equipment, a date set by hand included.
- A move with no operation type, or carrying no serial, makes no equipment.
