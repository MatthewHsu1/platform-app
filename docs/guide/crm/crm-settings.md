# CRM settings

Part of [CRM](../crm.md).

Settings → Apps → Platform → CRM. Everyone with the Applications permission can open the page;
only workspace administrators save it, so others see it read-only. Clearing the key field of a
plug point removes the stored key.

| Variable | Default | Effect |
| --- | --- | --- |
| `CRM_USE_LEADS` | off | New records start as leads (on) or opportunities (off); teams with Pipeline follow it |
| `CRM_USE_RECURRING_REVENUES` | off | Shows the recurring revenue fields in the lead views |
| `SALES_TEAM_MEMBERSHIP_MULTI` | off | A salesperson may be an active member of several teams |
| `CRM_LEAD_AUTO_ASSIGNMENT` | off | Rule-based assignment |
| `CRM_AUTO_ASSIGNMENT_ACTION` | Manually | Repeatedly lets the schedule run |
| `CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER`, `…_TYPE`, `…_NEXT_RUN` | 1, days, empty | Schedule (1 to 99) |
| `CRM_ASSIGNMENT_DELAY_HOURS` | 0 | Leads younger than this are not assigned (no screen) |
| `CRM_PLS_FIELDS`, `CRM_PLS_START_DATE` | all seven fields; install day − 8 days | Scoring fields and start date ("Update probabilities") |
| `CRM_PLS_REBUILD_CRON` | off | Nightly rebuild |
| `PLUG_POINTS`, `PLUG_KEY_CRM_ASSIGNMENT_V1` | off, empty | Plug points |
