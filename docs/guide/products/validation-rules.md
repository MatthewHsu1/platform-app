# Products: validation rules

Part of [Products](../products.md).

The install hook makes Twenty validation rules (names start with
`platform-`): required names, required relations (for example an attribute line needs its product
and attribute), "a multi-checkbox attribute never makes variants", margin, date and vendor-price
checks, and the unit factor. Twenty only runs them when `IS_VALIDATION_RULES_ENABLED` is on for the
workspace, and the hook only makes them while it is on (rerun the install after turning it on).

- Local: insert the feature flag row, then restart the server and the worker (the flag is cached):
  `insert into core."featureFlag" (key,"workspaceId",value) values
  ('IS_VALIDATION_RULES_ENABLED','<workspaceId>',true)` on the `twenty` database, then
  `docker restart spirit-twenty-server-1 spirit-twenty-worker-1`.
- Production: the owner turns the flag on for the workspace. Never do it from app code.
