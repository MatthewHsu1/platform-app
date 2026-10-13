# Build and publish

## Build and test

Node 24 (`.nvmrc`), from this folder:

```bash
yarn install --immutable
yarn lint && yarn typecheck && yarn test
yarn twenty dev:build --tarball   # .twenty/output/platform-<version>.tgz
```

The server's row access integration specs install that tarball. They find it through
`OWNER_ROW_ACCESS_APP_DIR`, or by default in this folder's `.twenty/output`. Run them with
`SERVER_URL=http://localhost:4000` and `OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER=39a89e81-0862-4929-a8ae-7a897d52f0a3`, so the install hook reaches the test server.

## Publish

Each publish needs a higher `version` in `package.json`; an equal one is refused.

```bash
yarn twenty remote:add --api-key <ADMIN_API_KEY> --url <SERVER_URL> --as <remote>
yarn twenty app:publish --private -r <remote>
yarn twenty app:install -r <remote>
```
