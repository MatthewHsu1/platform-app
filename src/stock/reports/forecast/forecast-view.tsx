import { type CSSProperties, type ReactNode } from 'react';
import { AppPath, navigate, useLocale, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { formatDay } from 'src/shared/front-components/utils/format-day.util';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { type ForecastProduct } from 'src/stock/reports/forecast/types/forecast-product.type';
import { type ForecastText } from 'src/stock/reports/forecast/types/forecast-text.type';
import { addDays } from 'src/stock/utils/stock-dates.util';
import { forecastRows } from 'src/stock/utils/forecast-rows.util';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';
import { type ForecastRow } from 'src/stock/utils/types/forecast-row.type';
import { type StockQuantityDay } from 'src/stock/utils/types/stock-quantity-day.type';

const GRAPH_WIDTH = 640;
const GRAPH_HEIGHT = 160;

const openRecord = (objectNameSingular: string, recordId: string) =>
  void navigate(AppPath.RecordShowPage, { objectNameSingular, objectRecordId: recordId });

const makeFormat = (locale: string, digits: number) => (value: number) => {
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return value.toFixed(digits);
  }
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// The forecast per day as a stepped line: the level holds until the next day.
const ForecastGraph = ({ graph, today, emptyText }: { graph: StockQuantityDay[]; today: string; emptyText: string }) => {
  const theme = themeCssVariables;
  const styles = readPopUpStyles();
  const locale = useLocale();

  if (graph.length < 2 || graph.every((day) => day.forecast === 0 && day.incoming === 0 && day.outgoing === 0)) {
    return <div style={styles.muted}>{emptyText}</div>;
  }
  const values = graph.map((day) => day.forecast);
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const xOf = (index: number) => (index / graph.length) * GRAPH_WIDTH;
  const yOf = (value: number) => GRAPH_HEIGHT - ((value - low) / (high - low)) * GRAPH_HEIGHT;
  const points = graph
    .flatMap((day, index) => [`${xOf(index).toFixed(1)},${yOf(day.forecast).toFixed(1)}`, `${xOf(index + 1).toFixed(1)},${yOf(day.forecast).toFixed(1)}`])
    .join(' ');
  const todayIndex = graph.findIndex((day) => day.date === today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], maxWidth: GRAPH_WIDTH }}>
      <svg width="100%" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} preserveAspectRatio="none" style={{ height: GRAPH_HEIGHT }}>
        <line x1={0} x2={GRAPH_WIDTH} y1={yOf(0)} y2={yOf(0)} stroke={theme.border.color.medium} />
        {todayIndex < 0 ? null : (
          <line x1={xOf(todayIndex)} x2={xOf(todayIndex)} y1={0} y2={GRAPH_HEIGHT} stroke={theme.border.color.strong} strokeDasharray="4 4" />
        )}
        <polyline points={points} fill="none" stroke={theme.color.blue} strokeWidth={2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...styles.muted }}>
        <span>{formatDay(graph[0].date, locale)}</span>
        <span>{formatDay(today, locale)}</span>
        <span>{formatDay(graph[graph.length - 1].date, locale)}</span>
      </div>
    </div>
  );
};

const HeaderNumber = ({ value, label, style }: { value: string; label: string; style?: CSSProperties }) => {
  const theme = themeCssVariables;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: theme.font.size.lg, fontWeight: 600, ...style }}>{value}</div>
      <div>{label}</div>
    </div>
  );
};

export const ForecastView = ({
  data,
  text,
  busy,
  onReserve,
  onUnreserve,
}: {
  data: ForecastAnswer;
  text: ForecastText;
  busy: boolean;
  onReserve: (moveId: string) => void;
  onUnreserve: (moveId: string) => void;
}) => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readPopUpStyles();
  const theme = themeCssVariables;
  const format = makeFormat(locale, data.digits);
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const unitOf = (productId: string) => productById.get(productId)?.uomName ?? '';
  const total = (pick: (product: ForecastProduct) => number) => sum(data.products.map(pick));
  const unit = data.products[0]?.uomName ?? '';
  const rows = forecastRows({
    lines: data.lines,
    productIds: data.products.map((product) => product.id),
    freeQtyOf: (productId) => productById.get(productId)?.free ?? 0,
    useExpirationDate: data.useExpirationDate,
    digits: data.digits,
  });
  const stockToReserveOf = (productId: string) =>
    sum(rows.filter((row) => row.line.productId === productId && row.available === 'stockToReserve').map((row) => row.line.quantity));
  // The shortest lead time of the variants, as a replenishment would take it.
  const lead = [...data.products].sort((left, right) => left.leadDays.totalDelay - right.leadDays.totalDelay)[0]?.leadDays;
  const arrival = lead === undefined ? null : addDays(data.today, lead.totalDelay);
  const toRemove = data.useExpirationDate ? total((product) => product.toRemove ?? 0) : null;
  const red = { color: theme.color.red };
  const green = { color: theme.color.green };
  const warning = { color: theme.color.orange };

  const documentLink = (document: { id: string | null; name: string } | null, emphasis?: CSSProperties) =>
    document === null || document.id === null ? null : (
      <button type="button" style={{ ...styles.link, fontWeight: 600, ...emphasis }} onClick={() => openRecord('stockPicking', document.id ?? '')}>
        {document.name}
      </button>
    );

  const availableCell = (row: ForecastRow) => {
    const { line } = row;

    switch (row.available) {
      case 'receipt':
        return (
          <>
            {documentLink(line.documentIn)}
            {line.receiptDate === null
              ? null
              : t(text.expectedOn, { quantity: format(line.quantity), unit: unitOf(line.productId), date: formatDay(line.receiptDate, locale) })}
          </>
        );
      case 'stockInTransit':
        return t(text.stockInTransit);
      case 'freeStockInTransit':
        return t(text.freeStockInTransit);
      case 'stockToReserve':
        return t(text.stockToReserve, { quantity: format(stockToReserveOf(line.productId)), unit: unitOf(line.productId) });
      case 'expired':
        return <span style={warning}>{t(text.expiredStock)}</span>;
      case 'freeStock':
        return t(text.freeStock);
      default:
        return <span style={styles.muted}>{t(text.notAvailable)}</span>;
    }
  };

  const removalText = (line: ForecastLine) =>
    line.removalDate === null ? null : line.removalDate === 'NOW' ? (
      <span style={warning}>{t(text.toRemoveNow)}</span>
    ) : (
      <span style={styles.muted}>{t(text.toRemoveOn, { date: formatDay(line.removalDate, locale) })}</span>
    );

  const actionCell = (row: ForecastRow) => {
    const moveId = row.line.moveOutId;

    if (row.action === null || moveId === null) {
      return null;
    }
    if (row.action.kind === 'unreserve') {
      return (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onUnreserve(moveId)}>
          {t(text.unreserve)}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onReserve(moveId)}>
        {row.action.quantity === null
          ? t(text.reserve)
          : t(text.reserveQuantity, { quantity: format(row.action.quantity), unit: unitOf(row.line.productId) })}
      </Button>
    );
  };

  const cell = (content: ReactNode, style?: CSSProperties, key?: string) => (
    <td key={key} style={{ ...styles.cell, ...style }}>
      {content}
    </td>
  );

  const footer = (product: ForecastProduct) => {
    const pending = product.forecast + product.draftIn - product.draftOut;
    const summaryRow = (label: string, value: number, valueStyle?: CSSProperties) => (
      <tr key={`${product.id}-${label}`} style={{ fontWeight: 600, background: theme.background.secondary }}>
        {cell(label)}
        {cell(`${format(value)} ${product.uomName}`, { textAlign: 'right', ...valueStyle })}
        {cell(null)}
        {cell(null)}
        {cell(null)}
      </tr>
    );
    const draftRow = (label: string, value: number) => (
      <tr key={`${product.id}-${label}`}>
        {cell(label)}
        {cell(`${format(value)} ${product.uomName}`, { textAlign: 'right' })}
        {cell(null)}
        {cell(null)}
        {cell(null)}
      </tr>
    );

    return [
      summaryRow(t(text.forecastedInventory), product.forecast, product.forecast <= 0 ? red : green),
      product.draftIn === 0 ? null : draftRow(t(text.incomingDraft), product.draftIn),
      product.draftOut === 0 ? null : draftRow(t(text.outgoingDraft), -product.draftOut),
      summaryRow(t(text.forecastedWithPending), pending, pending <= 0 ? red : green),
    ];
  };

  const lineRow = (row: ForecastRow, index: number) => {
    const { line } = row;
    const usedByStyle: CSSProperties = !line.replenishmentFilled
      ? { background: theme.color.transparent.red3 }
      : line.isMatched
        ? { background: theme.color.transparent.blue3 }
        : {};

    return (
      <tr key={`${line.productId}-${line.moveInId ?? ''}-${line.moveOutId ?? ''}-${index}`} style={line.isLate ? { background: theme.color.transparent.amber3 } : undefined}>
        {cell(availableCell(row))}
        {cell(`${format(line.quantity)} ${unitOf(line.productId)}`, {
          textAlign: 'right',
          ...(line.removalDate === 'NOW' ? warning : !line.replenishmentFilled ? red : {}),
        })}
        {cell(
          <span style={styles.row}>
            {documentLink(line.documentOut, line.isMatched ? { fontStyle: 'italic' } : undefined)}
            {removalText(line)}
          </span>,
          usedByStyle,
        )}
        {cell(actionCell(row))}
        {cell(line.deliveryDate === null ? '' : formatDay(line.deliveryDate, locale), line.deliveryLate ? red : undefined)}
      </tr>
    );
  };

  const isLastOfProduct = (index: number) => index === rows.length - 1 || rows[index + 1].line.productId !== rows[index].line.productId;
  const multipleProducts = data.products.length > 1;

  return (
    <>
      <div style={styles.row}>
        {data.headings.map((heading) => (
          <button
            key={heading.recordId}
            type="button"
            style={{ ...styles.link, fontSize: theme.font.size.lg, fontWeight: 600 }}
            onClick={() => openRecord(heading.objectNameSingular, heading.recordId)}
          >
            {heading.name}
          </button>
        ))}
        <span style={styles.muted}>{t(text.warehouse, { name: data.warehouse.name })}</span>
      </div>
      <div style={{ ...styles.row, gap: theme.spacing[4] }}>
        <HeaderNumber value={format(total((product) => product.onHand))} label={t(text.onHand)} />
        {toRemove === null ? null : (
          <>
            <span>−</span>
            <HeaderNumber value={format(toRemove)} label={t(text.toRemove)} />
          </>
        )}
        <span>+</span>
        <HeaderNumber value={format(total((product) => product.incoming))} label={t(text.incoming)} />
        <span>−</span>
        <HeaderNumber value={format(total((product) => product.outgoing))} label={t(text.outgoing)} />
        <span>=</span>
        <HeaderNumber
          value={`${format(total((product) => product.forecast))} ${unit}`}
          label={t(text.forecasted)}
          style={total((product) => product.forecast) < 0 ? red : undefined}
        />
        <HeaderNumber value={format(total((product) => product.free))} label={t(text.free)} style={styles.muted} />
      </div>
      {lead === undefined ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <div>
            {t(text.timeToReplenish)}{' '}
            <span style={{ color: theme.color.blue }}>
              {t(text.days, { days: lead.totalDelay })}
              {lead.totalDelay === 0 || arrival === null ? '' : ` (${formatDay(arrival, locale)})`}
            </span>
          </div>
          {lead.descriptions.length === 0 ? null : (
            <div style={{ ...styles.muted, display: 'grid', gridTemplateColumns: 'auto auto', justifyContent: 'start', columnGap: theme.spacing[4] }}>
              <span>{t(text.today)}</span>
              <span>{formatDay(data.today, locale)}</span>
              {lead.descriptions.map((description, index) => (
                <span key={index} style={{ display: 'contents' }}>
                  <span>{t(description.label.message, description.label.values)}</span>
                  <span>{t(description.value.message, description.value.values)}</span>
                </span>
              ))}
              <span>{t(text.earliestArrival)}</span>
              <span>{arrival === null ? '' : formatDay(arrival, locale)}</span>
            </div>
          )}
        </div>
      )}
      <ForecastGraph graph={data.graph} today={data.today} emptyText={t(text.graphEmpty)} />
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={styles.headerCell}>{t(text.available)}</th>
            <th style={{ ...styles.headerCell, textAlign: 'right' }}>{t(text.outgoing)}</th>
            <th style={styles.headerCell}>{t(text.usedBy)}</th>
            <th style={styles.headerCell} />
            <th style={styles.headerCell}>{t(text.deliveryDate)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row, index) => {
            const product = productById.get(row.line.productId);

            return [
              multipleProducts && row.startsProduct ? (
                <tr key={`${row.line.productId}-name`}>
                  <td colSpan={5} style={{ ...styles.cell, fontWeight: 600 }}>
                    {product?.name ?? ''}
                  </td>
                </tr>
              ) : null,
              lineRow(row, index),
              ...(isLastOfProduct(index) && product !== undefined ? footer(product) : []),
            ];
          })}
        </tbody>
      </table>
      {data.truncated ? <div style={styles.muted}>{t(text.truncated)}</div> : null}
    </>
  );
};
