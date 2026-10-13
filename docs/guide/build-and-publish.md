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

## Release

A release tag builds the app package and attaches it to a GitHub release. The workflow
(`.github/workflows/release.yml`) holds no server address and no API key: it uses only the
built-in `GITHUB_TOKEN`. Deploy repos install the package; this repo does not.

1. Raise `version` in `package.json` and merge it to `main`.
2. Run `yarn lint` locally. The workflow does not: lint needs Twenty's fork checkout.
3. Tag the merge commit and push the tag:

   ```bash
   git tag v<version> && git push origin v<version>
   ```

The tag must be `v<version>`. The workflow fails when it differs from `package.json`.
It then runs typecheck and tests, builds the package and creates the release.
To redo a failed run, start the workflow by hand (Actions, Release, Run workflow) with the tag.

The release is `v<version>` on `MatthewHsu1/platform-app`. Its one asset is
`platform-<version>.tgz`. Deploy repos download that asset (for example
`gh release download v<version> --repo MatthewHsu1/platform-app --pattern 'platform-<version>.tgz'`),
then run `app:publish --private` and `app:install` against their own server.
