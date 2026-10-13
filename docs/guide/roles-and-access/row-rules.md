# Row rules

Part of [Roles and row access](../roles-and-access.md).

**Row rules.** Each block may limit which rows of an object a person sees: `all`, `mine` (they are
the owner) or `mineOrUnowned` (they are the owner, or nobody is). A mix joins its blocks' rules on
each object and the widest wins; a block with no rule there does not widen it. Today: Lead
(owner field Salesperson) — Sales: Own Documents sees their own and unowned leads, All Documents
and Administrator see all. A person may create or change a row only so that it stays inside their
rule: a rep cannot give a lead to someone else. Admin and Platform's own role see every row. Any
other role (Twenty's Member, a role made by hand, an API key's role) sees only its own rows on a
ruled object. Twenty's own Company, Opportunity and Task have no rule.

The rules are Platform's `ROW_ACCESS_CONFIG` variable, written by Platform on every Roles page
save, install and daily run; do not edit it. Our Twenty fork enforces them (module
`packages/twenty-server/src/engine/twenty-orm/owner-row-access/` in the Twenty fork). A value the
server cannot read hides ruled objects from everyone but Admin and Platform until the next run
writes a good one. Platform not installed: no rules, Twenty behaves as upstream.
