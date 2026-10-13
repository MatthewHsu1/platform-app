# Products

Products, variants, attributes, pricelists, combos and units of measure (design:
`docs/superpowers/specs/2026-10-08-platform-products-design.md`).

## Modules

| Module | Holds |
| --- | --- |
| `src/uom/` | Units of measure (`uomUom`) with 30 default units |
| `src/product/` | Products (`productTemplate`), variants (`productProduct`), categories, tags, attributes and values, attribute lines, exclusions, packaging barcodes, vendor prices, pricelists and rules, combos |

## Detail files

- [After a save](products/after-a-save.md): variants, undone changes, deletes, imports
- [Validation rules](products/validation-rules.md)

**Not included:** `product.document` (every record has a Files tab), `company_id`, currency
conversion (the price code refuses to mix currencies), country groups on pricelists, settings
switches, per-category custom fields (add fields in Settings), chatter, label printing and
reports, and on-demand variants for Dynamically attributes (they come with Sales).

**Field names staff must not add** to product objects (a later version may add them, and
the upgrade then stops): the names in the object files, for example `listPrice`, `standardPrice`,
`defaultCode`, `barcode`, `weight`, `volume`, `saleOk`, `purchaseOk`, `productType`, `categ`,
`uom`, `active`, `sequence`, `priceExtra`, `lstPrice`, `createVariant`, `displayType`,
`relativeFactor`, `completeName`.
