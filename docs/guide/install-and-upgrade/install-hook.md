# The install hook

Part of [Install and upgrade](../install-and-upgrade.md).

`definePostInstallLogicFunction`, run on install and on every upgrade. Apart from the last step
below, it only adds what is missing and never changes what exists:

1. Staff lists that are missing on their object.
2. Default rows, only on the first install of 2.x (fresh, or over the 1.x app), so rows staff
   delete stay deleted.
3. Seed rows (stages New, Qualified, Proposition, Won; recurring plans; the Sales, Website and Point
   of Sale teams; the UTM stage New and tag Marketing) on the first install of 2.4.0, by seed key.
4. Boards that are missing by name: Pipeline and My pipeline (grouped by the Stage relation, one
   column per stage, the sum of expected revenue per column, lost leads hidden; My pipeline shows
   the signed-in person's leads only). The Rotting list is part of the app. Twenty v2.42+ lets an
   app token create views when its role has the Views flag.
5. Validation rules (probability 0 to 100, and the like). They are made only when the workspace
   flag `IS_VALIDATION_RULES_ENABLED` is on.
6. The sort of the Lead, Stage and Team "All" lists, once, while staff have set none.
7. Upkeep after every install: the stage columns of the boards, the lead type default and the
   scoring start date, the recurring revenue columns while that setting is on, the Pipeline
   sidebar item in the CRM folder, the mixed roles and the row rules, and the column trim of the
   "All" lists.

Upgrading from 2.3.x or older, a pre-install step deletes the old Stage staff list and the old
Pipeline board before the new Stage relation is made (the relation reuses the name `stage`). After
it, the install puts the campaigns that have no stage in the first campaign stage; their
responsible stays empty for staff to fill.

The app role has the Data Model, Views and Layouts permission flags for this (Layouts adds the Pipeline sidebar item), and Applications and Roles for the roles sync. The server lets it read every row.
Twenty refuses a SELECT or MULTI_SELECT with no options, so Tags starts with one option, Other.
