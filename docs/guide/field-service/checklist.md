# Field service: the checklist

Part of [Field service](../field-service.md).

A checklist is a list of activities: steps the worker does on the job. Orders and templates both have an
Activities tab. An activity has a name, a reference, a sequence, a Required flag, a state (To do, Completed,
Cancelled), and, once completed, the time and the member who completed it.

## From a template to an order

- A template's activities are patterns; they stay to do.
- When an order is made with a template, or saved with another one, the order's activities are dropped and one copy
  of each template activity is made (name, reference, sequence, Required; all to do). This runs just after the save.
- Clearing the template leaves the order's activities as they are. A template with no activities empties the
  checklist of an order that picks it.
- An activity can also be added to an order by hand.
- Deleting an order or a template takes its activities to the trash with it; restoring it brings them back.

## Working the checklist

- The Activities tab of an order lists the checklist with Complete and Cancel on each activity that is still to do.
  The same two buttons are in the menu of an activity's own page.
- Complete activity: stamps the time and the member, state Completed. Cancel activity: state Cancelled. Both need
  the Field service level User or higher, and only an activity of an order that is still to do.
- The state, the time and the member cannot be typed: only the buttons write them.
- Once an activity is completed or cancelled, a change to its name, Required flag or reference is undone just after
  the save, with a note.

## Completing the order

The Complete button on the order refuses while a required activity is still to do: "You must complete activity
'<name>' before completing this order." The first one in sequence is named. A cancelled required activity does not
stop the order. Because only the Complete button can complete an order, nothing else gets round the check.

Completing an order also marks its open tasks (the Tasks tab) as done.
