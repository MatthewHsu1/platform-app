# Work cases: service levels and working hours

Part of [Work cases](../work-cases.md).

## Working hours

A working-hours record has a time zone (a real IANA name), the working times of a week and the time off of the company. A new record without working times starts as a copy of the standard one. Each working time has a day, a period (morning, break, afternoon, full day), from and to hours and, in a two-week schedule, a week. A break separates two periods and is not worked; a line without a week counts as the first week. Two working times of one week cannot overlap: a new one is removed, a changed one is put back with a note.

The average hours per day is worked out from the working times (a typed value stays until they change).

Time off with no working hours counts for every record; a time off of the kind "Other" counts for none. An empty end becomes the last second of the start's day; an end before the start is undone.

A deadline is counted in working hours in the team's time zone, across weekends, time off and clock changes. A wall time that does not exist or exists twice takes the winter offset.

## Policies and rows

- A policy has days and hours (a day is the team's hours per day), a target stage, an optional filter
  and lists of teams, categories, tags and stages that pause the clock. Empty lists do not limit it.
- A case gets a row for each policy that matches: its team (or any), its tags (a case without tags only
  gets policies without tags), its category and the filter.
- A row starts at the case's creation. The state is accomplished when the case already reached the
  target stage, on hold in a paused stage, else in progress.
- A stage change adds the working hours since the last change; a case that reaches the target stage in
  time is accomplished, one still open at the deadline is expired and stays expired. A paused row moves
  its deadline by the pause.
- Rows attach when a case is made for a team that uses SLA and on the first save that sets its team
  while it has no rows. After a later change of category or tags, press Refresh SLA: it removes the
  rows of policies that no longer apply and adds the missing ones.
- A case shows the earliest deadline of its rows in progress and whether any row is expired. The "SLA
  expired" lists also show a row in progress whose deadline has passed, so no job flags it.
- A team that uses SLA and has no working hours gets rows without a deadline, and a warning in the
  function's log.
- A policy that rows still name cannot be deleted: the delete is undone with a note. Policy changes
  change no row.
