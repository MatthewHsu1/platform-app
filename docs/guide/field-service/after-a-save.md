# Field service: after a save

Part of [Field service](../field-service.md).

Triggers run after the save, so they do not block it: the number, the team and the request window appear a few
seconds after an order is made. A refused change is undone with a note on the record.

## A new order

- The number comes from the series (`FO001`, three digits). If no series is active the number stays `New`.
- The team is the location's team, else the active team with the lowest sequence. With no team at all the order
  is removed again (the function's log says why).
- The earliest request date is now (seconds dropped) when empty; the latest request date is the earliest plus
  the hours of the priority (normal 72, low 48, high 24, urgent 8, changed in the settings).
- The location's directions and a template's instructions are copied when empty. With equipment fill on, the
  equipment now at the location is added.

## A change

- Schedule: a start and an end give the duration; an end alone pulls the start back by the duration; a start
  that moves pushes the end by the duration; clearing the start clears the end. A duration change alone moves
  nothing. Seconds are dropped.
- A scheduled window that holds a whole time off (any working hours) is refused: "<date> is a holiday: <name>."
- Only the Complete button moves an order to Completed; a manual move is undone, and an order made straight
  into Completed (a card added to the Completed column of the board) is removed again. Cancelling and moving
  back to an open stage are allowed.
- Stage rules: a rule row names a stage and the order fields that stage needs (team, location, description,
  assigned to, scheduled start, resolution, signed by and so on). A staff move of an order into a stage while a
  listed field is empty is undone with a note: "Cannot move to stage Completed until the Resolution field is
  set." Several rows of one stage add up. The Complete and Cancel buttons check first and answer with the same
  text. A new order, a save that leaves the stage as it was and a save that clears a field of an order already in
  the stage are not checked. Zero, empty text, an empty rich text and no link all count as empty. The stage list
  of a rule is a copy of the order's: when staff add a stage to the order they add it to the rules too. Only the
  fields of the list can be required: not tags, categories, equipment, extra workers or fields staff add.
- A new location brings its team and directions, unless the same save sets them. A new template brings its
  instructions.
- Every save keeps the closed status (Completed and Cancelled close an order), the actual duration (hours from
  actual start to actual end) and the location's service area.
- An order without a description takes the notes of its equipment.
- Team counts (open orders, to assign, to schedule) follow every order change.

## Locations and equipment

- A location's full name is its parent's full name, then `[reference] name`; its full directions add its own
  to the parent's. A location cannot sit under itself; equipment neither.
- A new location without an owner takes its parent's owner.
- A new territory fills the branch, district and region; a new branch the district and region; a new district
  the region, unless the same save sets them. Equipment takes the territory of its location.
- A location counts its sub-locations and the equipment in it and below it.
- Team names and equipment names are unique among the rows not in the trash: a taken name is undone with a
  note (a new row loses it). A blank name is never taken.
- The warranty end follows the warranty start, length and unit (no length: today); the length and unit are the
  product's, see [Equipment stock and warranty](equipment-stock.md). An end before the start is refused.

## Work cases

Part of the work case link (`src/helpdesk-fieldservice/`).

- A new work case, and a case whose contact changes, takes the primary service location of its contact, else
  the one of the contact's company. A case that already sits at a location of the same customer keeps it, and
  a location set in the same save stays. A case without a contact keeps its location.
- A staff save that moves a case to a closed stage while one of its orders is open (not Completed or Cancelled)
  is undone with a note: "Please complete all service orders related to this work case to close it." A case
  without orders closes freely.
- A location counts its active work cases (the Work cases count). An archived case is not counted.
- A deleted case leaves its orders without the link; a deleted location leaves the cases, contacts and
  companies that named it.

## Deletes

- An order can be deleted only in the New stage. A location or team that orders use cannot be deleted. Such a
  delete comes back with a note.
- A deleted worker, type, template, area, contact or company leaves the records that named it. Link rows are
  removed for good, never trashed.
