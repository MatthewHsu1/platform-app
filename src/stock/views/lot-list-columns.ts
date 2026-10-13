import { LOT_FIELDS } from 'src/stock/page-layouts/field-ids';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, systemField } from 'src/stock/views/list-columns';
import { STOCK_LOT_ALL_FIELDS } from 'src/stock/views/object-fields';

// The lot list columns; the expiry dates stay hidden until staff show them.
export const lotListColumns = (viewUniversalIdentifier: string) =>
  listColumns(
    viewUniversalIdentifier,
    [LOT_FIELDS.name, LOT_FIELDS.product, systemField(STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER, 'createdAt')],
    STOCK_LOT_ALL_FIELDS,
  );
