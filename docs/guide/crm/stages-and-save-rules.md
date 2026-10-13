# Stages and save rules

Part of [CRM](../crm.md).

Stages are records (`crmStage`): order (`sequence`), "Is won stage", folded, days before a lead
rots, requirements, colour and, optionally, the teams that use them. The Pipeline board has one
column per stage; the stage trigger keeps the columns in stage order.

After each save of a lead the app applies the save rules and writes only what changes:

- Moving a lead to another stage stamps "Last stage update". A won stage sets the probability
  to 100 % and reopens a lost lead; moving between two won stages keeps the closed date.
- A lead in a won stage must stay at 100 %: a save that lowers it is refused and undone with a
  note.
- The closed date is set when a lead is won or lost and cleared when it reopens.
- Setting a salesperson stamps the assignment date and picks the salesperson's team (first a team
  they lead or belong to that handles this type of record, then any of their teams, then the first
  team).
- A contact's email and phone flow to its leads; a lead's new email or phone flows back to the
  contact (unless another contact already uses that email: a note says so).
- Prorated revenue, the recurring revenue results, days to assign and to close, phone and
  email quality and the rotting flag are kept up to date. An opportunity rots when it has stayed in
  a stage longer than the stage's days; a daily job (01:00 UTC) and a change of a stage's days
  refresh the flag.

Deleting a stage, lost reason, UTM stage, sales team named by a stage, the Website and Point of
Sale teams, the Referral source or the six standard mediums is undone with a note when it is
still used or protected. Deleting a team moves its members to the trash, takes it off its leads
and folds its scoring counts into the counts without a team.
