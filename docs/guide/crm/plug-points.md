# Plug points

Part of [CRM](../crm.md).

A plug point lets a company replace one decision with its own rule, without changing Platform.
The first one is `crm.assignment.v1`. Platform posts

```json
{ "plugPoint": "crm.assignment.v1", "requestId": "<uuid>", "sentAt": "<ISO time>", "payload": { "run": {}, "teams": [], "members": [], "leads": [] } }
```

to the target and expects `{ "plugPoint": "crm.assignment.v1", "requestId": "<same>", "payload":
{ "assignments": [{ "leadId": "…", "teamId": "…", "salespersonId": "…" }] } }`. The target is a
route of another app installed in this workspace (called with Platform's token) or an https
address (called with the key set on the settings page; Platform's token never leaves the
workspace). Platform checks the whole answer and does every write itself; on an error it runs its
own assignment or skips the run, as set on the page. Settings: the `PLUG_POINTS` variable.
