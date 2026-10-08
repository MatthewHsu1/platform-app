# Platform app

Twenty app (twenty-sdk 2.41.0, same as the server). Read `README.md` first. Design:
`docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

- One folder per module under `src/` (`src/crm/`, `src/utm/`). Each module keeps its universal
  ids in `*-universal-identifiers.constant.ts`. New ids are random UUID v4, never changed after
  release.
- Names: object = the module's reference model name in camelCase (`crm.lead` → `crmLead`); field = the
  reference field name in camelCase without `_id`/`_ids`. When Twenty reserves the name, pick a close one and note it
  on the object.
- Never define a staff-editable SELECT in app code: an upgrade wipes options staff added. Add it
  to the module's `*-install.ts` instead; the post-install hook makes it once as a workspace
  field. A SELECT in code is only for values code compares against (`*-options.constant.ts`).
- Pure logic goes in `utils/` with a vitest test next to it (`__tests__/*.test.ts`) whose
  expected values come from the module's rules or real examples. Logic functions stay thin: GraphQL
  calls and the util.
- Logic functions call GraphQL through `src/shared/twenty-graphql.ts`. Say which access each
  call uses: `'person'` (the clicking user, row rule applies) or `'application'` (the app role
  alone). Never make the app role see-all.
- The design notes for each module, including where its data model comes from, are in `docs/superpowers/` (not in git); read the handoff `docs/superpowers/sdd/2026-10-06-twenty-v2.45.6-upgrade/handoff.md` §9 before starting a module.
- Twenty app docs: https://docs.twenty.com/developers/extend/apps/getting-started/quick-start
