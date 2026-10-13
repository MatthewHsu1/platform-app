# Work cases: after a save

Part of [Work cases](../work-cases.md).

Triggers run after the save, so they do not block it: the number, the assignee and the stage appear a few seconds after a case is made.

## A new case

- The number comes from the series (`HT00001`, five digits); a number you type stays. If no series is
  active the number stays `/`.
- With "Assign new cases to their creator" on, a case a person creates without an assignee goes to
  that person, if the case has no team or the person is in its team. A case made by the API or by
  Platform stays unassigned.
- The team comes from the assignee when the case has none: the assignee's first team (by sequence,
  then creation). The stage is the first stage the team may use: stages with no team are open to every
  team; a stage with teams only to those.
- The assignment date is set when there is an assignee, the last stage update is the creation time,
  the closed date stays empty even in a closed stage. The customer company is copied from the contact
  and "Unattended" from the stage.

## A change

- A new stage sets the last stage update; a closed stage sets the closed date. The closed date is
  never cleared, also when the case goes back to an open stage.
- A new assignee sets the assignment date (never cleared). A case without a team takes the new
  assignee's first team.
- A new team removes an assignee who is not in it, and moves the case to the first stage the team
  may use when its stage is not one of them. The move does not count as a stage change.
- Values you save together with a change are never replaced by these rules.
- A new contact brings its company; a company changed on the contact reaches its cases.
- Team counts (open cases, without assignee, unattended, very high priority) follow the cases of a
  team that are active and not in a closed stage. A removed staff member leaves their cases without
  an assignee and every team counts again.

## Deletes

- Twenty trashes a record and cascades nothing, so the triggers do it.
- A stage that a case (archived too) still uses comes back with the note "This stage is used by work
  cases."; a stage that goes loses its team links and empties the duplicate stage setting.
- A category takes its sub-categories along and brings them back on restore. Its cases lose the category.
- A team or category cannot be its own parent, also through others: the change is undone with a note.
- A deleted team, category, tag, type, product or contact leaves the cases that named it. Link rows
  (team members, tags on cases, related cases, policy lists) are removed for good, never trashed.
- A deleted case takes its SLA rows to the trash and brings them back on restore; its tag and related
  links are gone for good and its opportunities lose the link.
