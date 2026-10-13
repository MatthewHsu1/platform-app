# Buttons

Part of [CRM](../crm.md).

Mark won (to the next won stage of the lead's team), Mark lost (one or many leads, optional
reason and closing note), Restore, Use automatic probability, Convert to opportunity (one lead:
create or link the customer, merge duplicates; many leads: deduplicate, round robin over the
chosen salespeople), Merge (2 to 5 leads; the best ranked lead stays, the others go to the trash
with their notes, tasks and files moved), Similar leads (same email domain, company or phone).

- Convert saves once. A stop after a merge leaves the kept lead unconverted; Apply again on it
  answers "Select at least two leads to merge", and reopening the dialog works.
- A company with the lead's company name is reused; else the company that already has the lead's
  website (compared on the domain Twenty stores: scheme, `www.`, case and path are ignored), and
  the lead and its new contact go under it. When that company is in the trash or hidden from the
  user, the new company is made without the website and a note says so. A taken email: the
  contact is made without the email and a note says so.
- A trashed note stays on the merged-away lead; only live notes move.
