# Work cases: buttons, settings and access

Part of [Work cases](../work-cases.md).

## Buttons

Buttons run as the clicking person (their role intersected with the app's); each logic function checks its condition again.

| Button | On | Does |
| --- | --- | --- |
| Assign to me | one case | Gives the case to the person; refused for a team they are not in |
| Mark as duplicate | one case | Asks for an original case and a stage; refused when duplicate tracking is off, when there is no original, when the original is the case itself or is a duplicate |
| Duplicate | ticked cases | Copies every field except number, stage, dates and the original; tags and related cases are copied, the copy's related links are one way. The copies are made by Platform |
| Create opportunity | one case | Makes an opportunity for the chosen salesperson and sales team (needs lead rights from a Sales level), linked to the case, with a note on the case |
| Refresh SLA | one case | See [service levels](service-levels.md) |

Select-all gives a button no record ids, so Duplicate acts on ticked rows only. Mark as duplicate is
listed even when tracking is off, because a button condition cannot read a setting; the dialog says why.

## Settings

Settings → Applications → Platform → Work cases: assign new cases to their creator, track duplicates, and the stage a duplicate moves to. Anyone may look; the workspace admin and Work cases: Administrator change them. A deleted duplicate stage empties the setting.

## Access

Building blocks on the Roles page (see [Roles and row access](../roles-and-access.md)): Work cases:
Own Documents, All Documents and Administrator.

- Own Documents works the cases assigned to the person and the cases nobody holds; All Documents and
  Administrator see every case. The rule reads the case's assignee.
- Everyone with a level changes cases, tags them and relates them; the tables a case points at (teams,
  stages, categories, tags, types, policies, working hours) are read-only below Administrator.

## Known limits

- Twenty cannot limit a picker: the stage of a case may be any stage and the product any variant, though
  the rules choose among the stages of the team. "Available for work cases" on a product limits nothing.
- A change saved twice with the same value does not stamp the dates again: a trigger sees real changes only.
- The duplicate checks live in the button; a direct edit of the original field is not checked.
- Rules run just after the save, not inside it.
- The folded stages of the board are hidden columns; if a Twenty version shows them anyway, the stages
  still sit in order.
- Not included: email and portal intake, followers and chatter, per-team custom fields, several companies.
