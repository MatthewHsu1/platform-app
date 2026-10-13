# Inventory: known limits

Part of [Inventory](../inventory.md).

## Known limits

- Inventory is one flat menu folder.
- List views are not grouped by warehouse, location or product, and a saved view keeps one sort
  key.
- Buttons on a selection act on the ticked rows only; select-all is refused.
- The note on a signed slip names the file and links the record.
- Messages from logic functions are English only.
- Sign is still offered on a delivery that is already signed; the pop-up then says so.
- A Locations filter on warehouse reads "Location: NotEmpty", and the Late views read "Past
  36500 days"; the queries behind them are right.

## Not included

`company_id` and several companies in one workspace, stock valuation and
landed costs (with Purchase), delivery carriers (with Sales), barcode scanning screens, GS1
barcodes (SSCC package labels are built), per-type custom fields, pivot views, partner languages
on printed documents.
