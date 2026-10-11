import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useLocale, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { DataTable } from 'src/shared/front-components/data-table';
import { ErrorText, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { toIsoDateTime, toLocalDateTime } from 'src/shared/front-components/utils/local-date-time.util';
import {
  INVENTORY_AT_DATE_ROUTE_PATH,
  INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { type InventoryAtDateRow } from 'src/stock/types/inventory-at-date-row.type';
import { INVENTORY_AT_DATE_PAGE_SIZE, inventoryProductLabel } from 'src/stock/utils/inventory-at-date.util';

// The texts the route answers, listed here so the extractor puts them in the catalog.
export const INVENTORY_AT_DATE_ROUTE_TEXTS = [msg('Choose a date.')];

type InventoryAtDatePage = { at: string; offset: number; hasMore: boolean; rows: InventoryAtDateRow[] };

// The date the table is for, written the way the person's language writes dates, in the browser's time zone.
const formatMoment = (isoValue: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoValue));
  } catch {
    return new Date(isoValue).toLocaleString();
  }
};

const InventoryAtDate = () => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readPopUpStyles();
  const { busy, error, call } = usePopUpCall(t('Could not compute the inventory at that date.'));
  const [at, setAt] = useState(() => toLocalDateTime(new Date().toISOString()));
  const [search, setSearch] = useState('');
  // Next and Previous page through what Show asked for, not what is typed since.
  const [shown, setShown] = useState<{ at: string | null; search: string } | null>(null);
  const [page, setPage] = useState<InventoryAtDatePage | null>(null);

  const load = async (query: { at: string | null; search: string }, offset: number) => {
    const next = await call<InventoryAtDatePage>(INVENTORY_AT_DATE_ROUTE_PATH, { ...query, offset });

    if (next !== null) {
      setShown(query);
      setPage(next);
    }
  };

  const offset = page?.offset ?? 0;

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('Inventory at Date')}</div>
      <div style={styles.row}>
        <Input type="datetime-local" value={at} onValueChange={setAt} />
        <Input value={search} placeholder={t('Search product or internal reference')} onValueChange={setSearch} />
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={busy}
          onClick={() => void load({ at: toIsoDateTime(at), search }, 0)}
        >
          {t('Show')}
        </Button>
      </div>
      <ErrorText error={error} />
      {page === null || shown === null ? null : (
        <>
          <div style={styles.muted}>{t('On hand at {date}', { date: formatMoment(page.at, locale) })}</div>
          <DataTable<InventoryAtDateRow>
            rowKey={(row) => row.productId}
            rows={page.rows}
            columns={[
              { key: 'product', title: t('Product'), render: inventoryProductLabel },
              { key: 'quantity', title: t('On Hand'), render: (row) => row.quantity },
              { key: 'unit', title: t('Unit'), render: (row) => row.uomName },
            ]}
          />
          <div style={styles.buttons}>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || offset === 0}
              onClick={() => void load(shown, Math.max(offset - INVENTORY_AT_DATE_PAGE_SIZE, 0))}
            >
              {t('Previous')}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !page.hasMore} onClick={() => void load(shown, offset + INVENTORY_AT_DATE_PAGE_SIZE)}>
              {t('Next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS.frontComponent,
  name: 'platform-stock-inventory-at-date',
  description: 'Asks a date and lists the quantity on hand of storable products at that date, a page at a time.',
  component: InventoryAtDate,
});
