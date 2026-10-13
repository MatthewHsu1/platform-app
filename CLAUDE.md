# Platform app

Twenty app (twenty-sdk 2.45.0, same as the server). Read `README.md` first. Design:
`docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

- One folder per module under `src/` (`src/crm/`, `src/utm/`, `src/uom/`,
  `src/product/`, `src/stock/`, `src/stock-picking-batch/`, `src/product-expiry/`, `src/base/`, `src/sales-team/`).
  Each module keeps its universal ids in `*-universal-identifiers.constant.ts`. New ids are random UUID v4, never changed after
  release. Shared plug points live in `src/shared/plug/`.
- Names: object = the module's reference model name in camelCase (`crm.lead` → `crmLead`); field = the
  reference field name in camelCase without `_id`/`_ids`. When Twenty reserves the name, pick a close one and note it
  on the object.
- Never define a staff-editable SELECT in app code: an upgrade wipes options staff added. Add it
  to the module's `*-install.ts` instead; the post-install hook makes it once as a workspace
  field. A SELECT in code is only for values code compares against (`*-options.constant.ts`).
- An exported type goes in its module's `types/` folder, one type per file, named
  `<kebab-name>.type.ts` (`src/stock/picking/types/validate-result.type.ts` exports
  `ValidateResult`), as Twenty's own apps do. A type used in one file only stays there, unexported.
- Comments and test names never cite the design or build documents: no task or phase numbers, no
  rule, probe or hole ids (`C17`, `CP22`, `RB5`, `T3`, `PF1`, `H9`), no spec sections (`§5.7`), no
  "the spec", "the brief" or "ruling". A reader of the code has none of those documents. Say the
  reason in plain words instead ("a done line is never destroyed: its stock is already posted").
- Pure logic goes in `utils/` with a vitest test next to it (`__tests__/*.test.ts`) whose
  expected values come from the module's rules or real examples. Logic functions stay thin: GraphQL
  calls and the util.
- Logic functions call GraphQL through `src/shared/twenty-graphql.ts`. Say which access each
  call uses: `'person'` (the clicking user, row rule applies) or `'application'` (the app role
  alone, which the server lets read every row). A route that writes with `'application'` first checks the clicking user's rights.
- Staff access is building blocks, never `defineRole`: a module declares its blocks in
  `src/roles/blocks/` (object rights, row rules per object, `implies`), adds them to
  `BUILDING_BLOCKS`, and adds its drop-down and the owner field of each ruled object to
  `ROLE_MODULES`. Platform makes one Twenty role per mix of blocks; block keys are never renamed.
- The design notes for each module, including where its data model comes from, are in `docs/superpowers/` (not in git); read the handoff `docs/superpowers/sdd/2026-10-06-twenty-v2.45.6-upgrade/handoff.md` §9 before starting a module.
- Twenty app docs: read the copy in the submodule, not the website. It matches our twenty-sdk
  version; the website follows Twenty's main branch. Paths are from this folder:
  - `../../../../twenty/packages/twenty-docs/developers/extend/apps/`: the app docs, one folder per
    topic (data, logic, layout, config, operations). Read the page for the piece you add.
  - `../../../../twenty/packages/twenty-agent-skills/skills/develop-app/SKILL.md`: Twenty's own
    workflow for changing an app.
  - `../../../../twenty/packages/create-twenty-app/src/constants/template/AGENTS.md`: Twenty's
    pitfalls for every app. Its `yarn twenty dev:add` writes to `src/objects/` and the like;
    move the file into its module folder.
  - `../../../../twenty/packages/twenty-apps/`: real apps to copy patterns from.
  - Website: https://docs.twenty.com/developers/extend/apps/getting-started/quick-start
- `yarn lint` uses the rules of Twenty's own code, with types (`--type-aware`) and Twenty's
  custom rules from the fork's checkout (`../../../../twenty`). After the fork changes, rebuild
  those rules there: `npx nx build twenty-oxlint-rules`. Fix the code; do not turn a rule off.
- Triggers read rows, call a pure planner in `utils/`, and write only what differs. A trigger
  skips events the app itself caused (its writes run as `'application'`), re-reads the row before
  it puts a change back, and collects its errors instead of stopping at the first one, so one bad
  row does not hide the rest. A second pass must find nothing to write: no loops. Exception: the
  lead trigger applies the computed values (team, stage repair, status, money, quality, rotting,
  score) to every write, and the save rules (stage date, won stage, closed date, assignment date,
  contact push, scoring counts) only to writes the app did not make; app code that writes a lead
  runs the save rules itself through `writeLeadsAsApplication`.
- Validation-rule expressions name relation fields (`isDefined(productTmpl)`), never join columns
  (`productTmplId` does not parse). Fields the app fills after the save (vendor price
  `productTmpl`, template attribute value fields) get no required rule.
- Stock levels change only through `applyQuantDelta` (compare-and-set on the row's `version`:
  update where id and version match, retry on zero rows). Never write `quantity` or
  `reservedQuantity` directly; reserved is recomputed by `recomputeReserved`.
- A button that changes stock or moves takes a claim (`withClaim`, `src/shared/claims/`) and every
  step after it is safe to run twice.
- Each derived value has one writer (`recomputeMove`, `recomputePickingState`,
  `recomputeProductQuantities`, `recomputeLocation`, ...). Buttons, triggers and the daily job
  call that writer; nothing else writes the value.
- Values a record page shows but nobody stores are computed on read by a route and shown by a
  front component (`src/stock/facts/`), not stored.
- Every user-visible string is translatable: `t`/`msg`/`Trans` in front components,
  `translate()` in logic functions; run `yarn twenty dev:translations-extract` after adding text.
- Front components: twenty-ui `Button`/`Input`, native `<select>` styled from theme tokens read
  inside the component, no twenty-ui popups, no `<canvas>`, catch every error.
- Never replace a record page. Add tabs to Twenty's generated page with `definePageLayoutTab`
  (target: `getSystemRecordPageLayoutUniversalIdentifier` with the app id); fields stay on
  Twenty's left side.
- A list view shows at most 10 visible columns; every other field is a hidden column.
