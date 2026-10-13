# CRM

Leads, stages and the rules that run after each save, the sales teams, lead assignment, predictive scoring, plug points, the UTM source objects and the CRM settings page. Short rules are below; the longer sections have their own file.

## Modules

| Module | Holds |
| --- | --- |
| `src/crm/` | Lead (`crmLead`): one record from first contact to won or lost; Stage (`crmStage`, with won stages, folding, rotting days and team limits), Recurring plan (`crmRecurringPlan`), Lost reason (`crmLostReason`). Save rules run after each save (stage date, won stage at 100 %, closed date, assignment date, prorated and recurring revenue, phone and email quality, rotting). Buttons: Mark won, Mark lost, Restore, Use automatic probability, Convert (one or many), Merge, Similar leads. Lead assignment (`src/crm/assignment/`) and predictive scoring (`src/crm/scoring/`) |
| `src/sales-team/` | Sales team (`crmTeam`) and member (`crmTeamMember`), the stage–team link (`crmStageTeam`); a lead's team follows its salesperson |
| `src/crm/settings/` | The CRM settings page (Settings → Apps → Platform → CRM) and its routes |
| `src/shared/plug/` | Plug points: a company may let another app or service make one Platform decision (first: lead assignment) |
| `src/utm/` | Source, Medium, Campaign (`utmSource`, `utmMedium`, `utmCampaign`; a campaign has a stage and tags), UTM stage and tag (`utmStage`, `utmTag`) |

## Detail files

- [Stages and save rules](crm/stages-and-save-rules.md)
- [Buttons](crm/buttons.md)
- [Lead assignment](crm/lead-assignment.md)
- [Plug points](crm/plug-points.md)
- [Predictive scoring](crm/predictive-scoring.md)
- [CRM settings](crm/crm-settings.md)

## Screens

CRM folder in the sidebar: Pipeline, Leads, Teams, Stages, Lost reasons, Recurring plans. UTM
folder: Campaigns, Sources, Mediums, Stages, Tags. A lead has the Home tab Twenty draws and a
Probability tab that explains the automated probability. A team and a team member have an
Assignment tab with counters (unassigned leads and leads assigned in the last 30 days against the
capacity; leads in the last 24 hours and 30 days). A company has a Leads tab with the leads of the
company and of its people. Counters run with the signed-in person's rights, so leads their row rule
hides are not counted. The Rotting list shows rotting opportunities, longest first. Lists show at
most 10 columns; staff can switch more on.

## Sales roles

Sales: Own Documents (works the leads where they are the salesperson, and the leads nobody owns
yet), Sales: All Documents (sees every lead) and Sales: Administrator (all CRM and UTM objects,
assignment) are building blocks on the Roles page (see [Roles and row access](roles-and-access.md)). The row rule on Lead
is what separates them: Own Documents `mineOrUnowned`, the other two `all`. Unassigned leads are
seen by Own Documents, by the wider levels, by Admin and by Platform's own role. The CRM settings
page needs the Applications permission, which a Sales level does not give.

## Release order

Turn on `IS_VALIDATION_RULES_ENABLED` for the workspace first, then install 2.4.0. The two
server settings in [Roles and row access](roles-and-access.md) come before the new image.
