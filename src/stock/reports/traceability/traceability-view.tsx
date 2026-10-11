import { useState } from 'react';
import { AppPath, navigate, useLocale, useTranslate } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { DataTable } from 'src/shared/front-components/data-table';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type TraceabilityAnswer } from 'src/stock/reports/traceability/types/traceability-answer.type';
import { type TraceabilityText } from 'src/stock/reports/traceability/types/traceability-text.type';
import { TRACEABILITY_ROUTE_PATH } from 'src/stock/stock-reports-universal-identifiers.constant';
import { type TraceRecordLink } from 'src/stock/utils/types/trace-record-link.type';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

type ShownRow = { row: TraceRow; depth: number; key: string };

const INDENT_PX = 16;

// A date-time written the way the person's language writes it, in the browser's time zone.
const formatMoment = (isoValue: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoValue));
  } catch {
    return new Date(isoValue).toLocaleString();
  }
};

const openRecord = (record: TraceRecordLink) =>
  void navigate(AppPath.RecordShowPage, { objectNameSingular: record.objectNameSingular, objectRecordId: record.recordId });

// The traceability lines of a lot, a transfer or a move line. A line that can
// unfold shows the lines one step upstream of it underneath, indented.
export const TraceabilityView = ({
  model,
  recordId,
  data,
  text,
  onError,
}: {
  model: string;
  recordId: string;
  data: TraceabilityAnswer;
  text: TraceabilityText;
  onError: (message: string) => void;
}) => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readPopUpStyles();
  const [children, setChildren] = useState<Record<string, TraceRow[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = async (key: string, lineId: string) => {
    if (open[key] === true) {
      setOpen((current) => ({ ...current, [key]: false }));
      return;
    }
    if (children[key] === undefined) {
      try {
        const answer = await postAppRoute<TraceabilityAnswer>(TRACEABILITY_ROUTE_PATH, { model, recordId, unfoldLineId: lineId });

        setChildren((current) => ({ ...current, [key]: answer.rows }));
      } catch (caught) {
        onError(describeRouteError(caught, t(text.unfoldFailed)));
        return;
      }
    }
    setOpen((current) => ({ ...current, [key]: true }));
  };

  // A line can show up again under another branch, so a row's key is its path.
  const flatten = (rows: TraceRow[], depth: number, parentKey: string): ShownRow[] =>
    rows.flatMap((row) => {
      const key = `${parentKey}/${row.lineId}`;
      const below = open[key] === true ? (children[key] ?? []) : [];

      return [{ row, depth, key }, ...flatten(below, depth + 1, key)];
    });

  const linkOr = (label: string, record: TraceRecordLink | null) =>
    record === null || label === '' ? (
      label
    ) : (
      <button type="button" style={styles.link} onClick={() => openRecord(record)}>
        {label}
      </button>
    );

  const linkList = (links: (TraceRecordLink & { name: string })[]) =>
    links.map((record, index) => (
      <span key={record.recordId}>
        {index > 0 ? ', ' : ''}
        {linkOr(record.name, record)}
      </span>
    ));

  return (
    <>
      {data.deliveries === null ? null : (
        <>
          {data.deliveries.transfers.length === 0 ? null : (
            <div style={styles.row}>
              <span style={styles.muted}>{t(text.deliveries)}</span>
              <span>{linkList(data.deliveries.transfers)}</span>
            </div>
          )}
          {data.deliveries.customers.length === 0 ? null : (
            <div style={styles.row}>
              <span style={styles.muted}>{t(text.customers)}</span>
              <span>{linkList(data.deliveries.customers)}</span>
            </div>
          )}
        </>
      )}
      {data.rows.length === 0 ? (
        <div>{t(text.empty)}</div>
      ) : (
        <DataTable<ShownRow>
          rowKey={(shown) => shown.key}
          rows={flatten(data.rows, 0, '')}
          columns={[
            {
              key: 'reference',
              title: t(text.reference),
              render: ({ row, depth, key }) => (
                <span style={{ paddingLeft: depth * INDENT_PX }}>
                  {row.unfoldable ? (
                    <button
                      type="button"
                      style={styles.link}
                      title={open[key] === true ? t(text.fold) : t(text.unfold)}
                      onClick={() => void toggle(key, row.lineId)}
                    >
                      {open[key] === true ? '▾' : '▸'}
                    </button>
                  ) : null}{' '}
                  {linkOr(row.reference, row.referenceRecord)}
                </span>
              ),
            },
            { key: 'product', title: t(text.product), render: ({ row }) => row.productName },
            { key: 'date', title: t(text.date), render: ({ row }) => formatMoment(row.date, locale) },
            {
              key: 'lot',
              title: t(text.lot),
              render: ({ row }) => linkOr(row.lotName, row.lotId === null ? null : { objectNameSingular: 'stockLot', recordId: row.lotId }),
            },
            { key: 'from', title: t(text.from), render: ({ row }) => linkOr(row.from, row.fromRecord) },
            { key: 'to', title: t(text.to), render: ({ row }) => linkOr(row.to, row.toRecord) },
            { key: 'quantity', title: t(text.quantity), render: ({ row }) => row.quantity },
          ]}
        />
      )}
    </>
  );
};
