# Products: after a save

Part of [Products](../products.md).

Triggers run after the save, so they do not block it:

- Variants appear a few seconds after a save, not at once. A product with no attributes has one
  variant, made for it.
- Where a change is not allowed, the app puts it back and adds a note on the record: "Change
  undone" (or "Delete undone" for a delete). A new row that is not allowed is removed.
- Deleting a product moves its variants, attribute lines, the product's attribute values (its
  template attribute values), exclusions, vendor prices and pricelist rules to the trash. Its
  tag, packaging and combo links are removed for good. The shared attribute values are not
  touched. Restoring the product from the trash gives it a new variant; its old variants,
  attribute lines, vendor prices and pricelist rules stay in the trash.
- A variant that a combo item uses cannot be deleted, and neither can a product with such a
  variant. The delete is undone and a note explains why.
- Deleting a combo choice moves its combo items to the trash and removes its combo links for good.
- Deleting a pricelist moves its rules to the trash. Deleting an attribute moves its values to the
  trash; it is refused while any attribute line names it, archived lines and lines of archived
  products too. Deleting a category moves its child categories, theirs, and its pricelist rules to
  the trash. Deleting a unit moves the units based on it, and theirs, to the trash with its
  packaging barcodes, and removes its product packaging links for good. It is refused while a
  product (archived too) or a vendor price uses the unit or one of those units. Products keep a
  deleted category; Twenty shows the field empty.
- Changing a product's type away from Combo removes its combo links. Twenty's update events
  carry only the fields that changed, so this runs when the type actually changes.
- A variant made by hand is removed for good with a note on the product: variants come from the
  attribute values. A variant restored from the trash is checked the same way.
- A barcode typed on a product is checked like one typed on its variant.
- Vendor price, pricelist rule and combo item names follow a rename of their product, variant or
  category.
- A sellable combo may only hold sellable products. A change that breaks this is put back with a
  note.
- Link rows (tags, packagings, attribute values on a line, exclusion values, combo links) are
  deleted for good when removed, so the same value can be added again. A refused new attribute
  line, exclusion, pricelist rule, combo item or variant is deleted for good, not moved to the
  trash. An exclusion made together with its refused value (within a few seconds) goes with it; an
  exclusion saved before stays, with no value.
- A big import runs at the app's API rate limit (Twenty allows an app 500 requests a minute,
  `APPLICATION_API_RATE_LIMITING_LIMIT`), about 150 products a minute. Raise it on the server
  for large imports.
