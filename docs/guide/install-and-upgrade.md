# Install and upgrade

How the app installs and upgrades, what staff may change, and the upgrade from the 1.x app. Build, test and publish steps are in [Build and publish](build-and-publish.md).

## Modules

| Module | Holds |
| --- | --- |
| `src/shared/install/` | The pre-install step (upgrade clean-up) and the post-install hook |

## Detail files

- [The install hook](install-and-upgrade/install-hook.md)

## Three kinds of field

| Kind | Owner | Example |
| --- | --- | --- |
| Fixed field | The app. Code reads it | Won status, Type, Priority |
| Staff list | The workspace. The hook makes it once with default options; staff change options, colors and labels, and upgrades keep them | Tags, Language |
| Lookup table | The app owns the table, staff own the rows | Stage, Source, Medium, Campaign, Lost reason |

Stage is for people (the board); Won status is for code. Mark won moves a lead to the next won
stage of its team (a stage marked "Is won stage") and sets the probability to 100 %.

## Rules for staff

- Add your own fields to our objects in Settings → Data model. Upgrades keep them. Do not give
  them one of those names: if a later version adds a field with the same name, the upgrade stops
  until you rename yours.
- Deleting or deactivating the Tags or Language field on leads turns those scoring factors off;
  the lead rules go on without them.
- **Uninstalling the app deletes its objects with every staff field, staff list and board on
  them.** A reinstall brings back only the defaults.

## Upgrade from the 1.x app

Needs our Twenty image v2.45.6 or later with the row-access change: older images read the rules from the retired
row-access app. The upgrade deletes the old Lead and Lead Source tables. Production held no real
lead data (2026-10-06).

1. Publish and install the new version. The hook makes Stage, Tags, the default rows and the
   Pipeline board.
2. On Platform's settings tab, set the row rule on Lead (`crmLead`), owner field Salesperson, and
   any other rules the workspace had in the row-access app.
3. Uninstall the row-access app.
4. Hide Twenty's built-in Opportunity (Settings → Data model).

For the CRM release order see [CRM](crm.md#release-order).
