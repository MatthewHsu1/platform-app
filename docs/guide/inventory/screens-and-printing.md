# Inventory: screens, printing and reports

Part of [Inventory](../inventory.md).

## Screens

Record pages are Twenty's own page with every field on the left; the app adds tabs
for related lists and reports. Inventory lists open with at most 10 columns; the other fields are
hidden columns staff can switch on. On install the app hides all but 10 columns of each object's
"All" list once; a column staff show again stays shown. A fresh install finishes the trim within
a day (the daily job carries on where the install stopped). Counts on the Overview open saved
views of the list. Status buttons on a transfer open one record. Physical Inventory and My
Counts sort by location only.

## Printing

A Print command gives a link that opens a printable page in a new browser tab
(barcodes drawn on the page); print it from the browser. ZPL labels download as a `.zpl` file. A
link works once and for 10 minutes. Nothing is saved, except the signed delivery slip, which is
kept on the transfer. Operation types can offer slips and labels automatically at Validate, only
for a Validate a person makes (a Validate the daily job resumes shows no links). Labels: Print
Labels on products and transfers.

## Delivery email

The app sends none. An admin can build a Twenty workflow: Record is Updated on
Transfers, state Done on a delivery, then Send Email from a connected mailbox. The workflow fires
on transfers the app sets to Done, and its To field can use the contact person's email. A
workspace needs a connected mailbox to send; the first test of this workflow, on a workspace with
none, sent nothing.

## Reports

Inventory → Overview, Moves Analysis (a page with charts and the done moves);
Forecasted (products, moves, reordering rules), Inventory at Date (product variants, opened from
the variant list, pages of 80 with search), Traceability (lots, done transfers), Allocation
(receipts), Product Routes Report (products).

## Translations

Screen text is translatable (`locales/`); English only for now. Refresh the
catalog with `yarn twenty dev:translations-extract` after adding text. Record data (names,
descriptions) is one language for everyone.
