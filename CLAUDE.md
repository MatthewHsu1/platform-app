# Platform app

Twenty app (twenty-sdk 2.41.0, same as the server). Read `README.md` first. Design:
`docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

- One folder per the reference module under `src/` (`src/crm/`, `src/utm/`). Copy the the reference ERP
  model of that module (or the OCA module where the reference's is paid). Each module keeps its universal
  ids in `*-universal-identifiers.constant.ts`. New ids are random UUID v4, never changed after
  release.
- Names: object = the reference model in camelCase (`crm.lead` → `crmLead`); field = the reference field in
  camelCase without `_id`/`_ids`. When Twenty reserves the name, pick a close one and note it
  on the object.
- Never define a staff-editable SELECT in app code: an upgrade wipes options staff added. Add it
  to the module's `*-install.ts` instead; the post-install hook makes it once as a workspace
  field. A SELECT in code is only for values code compares against (`*-options.constant.ts`).
- Pure logic goes in `utils/` with a vitest test next to it (`__tests__/*.test.ts`) whose
  expected values come from the reference's rules or real examples. Logic functions stay thin: GraphQL
  calls and the util.
- Logic functions call GraphQL through `src/shared/twenty-graphql.ts`. Say which access each
  call uses: `'person'` (the clicking user, row rule applies) or `'application'` (the app role
  alone). Never make the app role see-all.
- Twenty app docs: https://docs.twenty.com/developers/extend/apps/getting-started/quick-start
