# Changelog

All notable changes to this application are documented in this file.

## 2.1.1

- The row access settings page no longer crashes with "Cannot use 'in' operator to search for
  'composedPath'" when the pointer or focus reaches a section description.

## 2.1.0

- Row access is part of Platform: its settings tab chooses the owner-only objects, their owner
  field and the roles that see every row. The separate row-access app is retired.
- Platform's role adds the Applications and Roles permissions for that page.

## 2.0.0

- The app is now "Platform", modelled on the reference. It replaces the Spirit app (same universal id).
- CRM: Lead (`crmLead`, lead and opportunity in one record), Lost reason, and the buttons
  Convert to opportunity, Mark won, Mark lost and Restore.
- UTM: Source, Medium and Campaign, with the reference's default rows.
- A post-install hook makes the staff lists Stage and Tags and the Pipeline board.
- Removed: Lead and Lead Source of 1.x, Meta intake, and conversion to Twenty's Opportunity.
  The upgrade deletes their tables.

## 1.0.1

- Convert shows a success or error message and opens the new opportunity. An error no
  longer leaves the button dead until the page reloads.

## 1.0.0

- Lead and Lead Source objects, Meta intake, Convert to opportunity.
