# Work cases

Customer problems staff work on: a numbered case with a team, an assignee, a stage, a priority, a category, tags, a type and a product; teams with members; service level promises counted in working hours; links from a case to sales opportunities and to other cases. Customer chat, phone and AI agents stay outside Platform; people create cases by hand or through the Twenty API.

## Modules

| Module | Holds |
| --- | --- |
| `src/helpdesk/` | Case (`helpdeskTicket`), team, stage, category, tag and the links between them; the save rules and triggers; the install data, board and lists; the buttons Assign to me, Mark as duplicate and Duplicate; the settings page |
| `src/helpdesk-type/` | Case type and the type–team link |
| `src/helpdesk-product/` | The product of a case; "Available for work cases" on a product |
| `src/helpdesk-crm/` | The opportunity of a case, and the Create opportunity button |
| `src/helpdesk-ticket-related/` | Related cases, linked both ways |
| `src/helpdesk-sla/` | SLA policies, the SLA row of a case and policy, the engine that makes and recomputes them, the Refresh SLA button, the filter tab of a policy |
| `src/resource/` | Working hours (`resourceCalendar`), working times and time off, and the functions that count in them |

## Detail files

- [After a save](work-cases/after-a-save.md): numbering, assignment, stage and dates, copies, counts, deletes
- [Service levels and working hours](work-cases/service-levels.md)
- [Buttons, settings and access](work-cases/buttons-settings-access.md)

## Screens

Work cases folder in the sidebar: Cases board, Cases, Teams, Stages, Categories, Tags, Types, SLA
policies, Case SLAs, Working hours. The Cases list also has the views My cases, Unassigned and SLA
expired; the Case SLAs list has Expired. A policy has a Filter tab. Lists show at most 10 columns;
staff can switch more on.

## Install

The install makes the number series (`HT00001`), the six first stages (New, In Progress, Awaiting,
Done, Cancelled, Rejected), the channel list, the standard working hours (Monday to Friday, 8 to 12
and 13 to 17) and the board and lists. It adds only what is missing. Names of cases, teams and stages
have no required rule: Twenty saves a new row before its name is typed, so such a rule would refuse
every new row.
