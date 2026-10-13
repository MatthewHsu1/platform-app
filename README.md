# Platform

Our generic business app for Twenty, with a CRM, units of measure and a product catalog. Any company can install it. One folder per module under `src/`.

Design: `docs/superpowers/specs/2026-10-06-twenty-platform-crm-design.md`.

## Modules

| Module | Holds |
| --- | --- |
| `src/crm/` | Leads, stages, lost reasons, recurring plans, assignment and predictive scoring ([CRM](docs/guide/crm.md)) |
| `src/sales-team/` | Sales teams, members and the stage–team link |
| `src/crm/settings/` | The CRM settings page |
| `src/shared/plug/` | Plug points: another app or service makes one Platform decision |
| `src/utm/` | Source, Medium, Campaign, UTM stage and tag |
| `src/uom/` | Units of measure with 30 default units ([Products](docs/guide/products.md)) |
| `src/product/` | Products, variants, attributes, pricelists, combos ([Products](docs/guide/products.md)) |
| `src/stock/`, `src/stock-picking-batch/`, `src/product-expiry/`, `src/base/` | Inventory: warehouses, transfers, stock levels, counts, lots, reports ([Inventory](docs/guide/inventory.md)) |
| `src/shared/install/` | The pre-install step and the post-install hook ([Install and upgrade](docs/guide/install-and-upgrade.md)) |
| `src/roles/` | Staff access: building blocks and the Roles page ([Roles and row access](docs/guide/roles-and-access.md)) |

Later modules, each with its own design: Sales, Purchase, Work cases, Field service.

## Requirements

- Node 24 (`.nvmrc`) and Yarn.
- A Twenty server on the same version as the SDK (`twenty-sdk` 2.45.0).
- Logic functions need `LOGIC_FUNCTION_TYPE=LOCAL` on the server and worker.

## Quick start

From this folder:

```bash
yarn install --immutable
yarn lint && yarn typecheck && yarn test
yarn twenty dev:build --tarball   # .twenty/output/platform-<version>.tgz
```

## Publish

Each publish needs a higher `version` in `package.json`; an equal one is refused.

```bash
yarn twenty remote:add --api-key <ADMIN_API_KEY> --url <SERVER_URL> --as <remote>
yarn twenty app:publish --private -r <remote>
yarn twenty app:install -r <remote>
```

Upgrading from the 1.x app: see [Install and upgrade](docs/guide/install-and-upgrade.md#upgrade-from-the-1x-app).

## Documentation

The guides are in `docs/guide/`: [CRM](docs/guide/crm.md), [Inventory](docs/guide/inventory.md), [Products](docs/guide/products.md), [Roles and row access](docs/guide/roles-and-access.md), [Install and upgrade](docs/guide/install-and-upgrade.md), [Build and publish](docs/guide/build-and-publish.md).
