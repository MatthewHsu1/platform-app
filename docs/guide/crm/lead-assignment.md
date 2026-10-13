# Lead assignment

Part of [CRM](../crm.md).

Teams have an assignment filter and a capacity (the sum of their members' 30-day capacity);
members have a filter, a preferred filter and a capacity. "Assign leads" on a team, "Assign now"
on the CRM settings page, or the schedule (a check every 5 minutes that runs only when rule-based
assignment is on and set to Repeatedly, and only when the repeat interval on the page has passed;
a run that stops waits one interval) first gives unassigned leads to teams (weighted by capacity,
merging duplicates), then to members (preferred leads first, round robin within each member's
daily quota). Only Sales: Administrator and workspace administrators run it by hand.
