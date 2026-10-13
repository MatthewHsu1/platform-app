import { type CSSProperties, type ReactNode } from 'react';
import { useLocale, useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Status, Tag } from 'twenty-ui/primitives/data-display';
import { Button } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';

import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { formatDay } from 'src/shared/front-components/utils/format-day.util';
import { readSummaryGrids } from 'src/stock/reports/forecast/forecast-summary-grids';
import { ForecastGraph, makeFormat, openRecord, sum } from 'src/stock/reports/forecast/forecast-view';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { type ForecastProduct } from 'src/stock/reports/forecast/types/forecast-product.type';
import { type ForecastSummaryText } from 'src/stock/reports/forecast/types/forecast-summary-text.type';
import { forecastGraphSummary } from 'src/stock/utils/forecast-graph-summary.util';
import { forecastRows } from 'src/stock/utils/forecast-rows.util';
import { addDays } from 'src/stock/utils/stock-dates.util';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';
import { type ForecastRow } from 'src/stock/utils/types/forecast-row.type';

// One framed block of the page: a heading with its note, then the content.
const Panel = ({ title, note, aside, children, style }: { title: string; note?: string; aside?: ReactNode; children: ReactNode; style?: CSSProperties }) => {
  const theme = themeCssVariables;

  return (
    <Section.Root style={style}>
      {/* The note goes in a span: twenty-ui puts a plain-text description in a hover tooltip, and a tooltip's hover listener fails inside the front component sandbox. */}
      <Section.Header title={title} description={note === undefined ? undefined : <span>{note}</span>} adornment={aside} />
      <Card.Root rounded>
        <div style={{ padding: theme.spacing[3], display: 'flex', flexDirection: 'column', gap: theme.spacing[2], minWidth: 0 }}>{children}</div>
      </Card.Root>
    </Section.Root>
  );
};

const Metric = ({ color, label, value, note, valueColor }: { color: 'gray' | 'blue' | 'red' | 'green' | 'orange'; label: string; value: string; note: string; valueColor?: string }) => {
  const theme = themeCssVariables;

  return (
    <Card.Root rounded style={{ minWidth: 0 }}>
      <div style={{ padding: theme.spacing[3], display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <Status color={color} weight="regular">
          {label}
        </Status>
        <div style={{ fontSize: theme.font.size.xl, fontWeight: theme.font.weight.semiBold, color: valueColor ?? theme.font.color.primary }}>{value}</div>
        <div style={{ fontSize: theme.font.size.sm, color: theme.font.color.tertiary }}>{note}</div>
      </div>
    </Card.Root>
  );
};

const DetailRow = ({ label, note, value, valueColor }: { label: string; note?: string; value: ReactNode; valueColor?: string }) => {
  const theme = themeCssVariables;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        columnGap: theme.spacing[4],
        alignItems: 'center',
        padding: `${theme.spacing[2]} 0`,
        borderTop: `1px solid ${theme.border.color.light}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: note === undefined ? theme.font.color.secondary : theme.font.color.primary }}>{label}</span>
        {note === undefined ? null : <span style={{ fontSize: theme.font.size.sm, color: theme.font.color.tertiary }}>{note}</span>}
      </div>
      <span style={{ fontWeight: theme.font.weight.medium, color: valueColor ?? theme.font.color.primary, textAlign: 'right' }}>{value}</span>
    </div>
  );
};

// A value under its label; a row of these wraps onto lines as the room shrinks.
const Field = ({ label, color, children }: { label: string; color?: string; children: ReactNode }) => {
  const theme = themeCssVariables;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], minWidth: 0, overflowWrap: 'anywhere' }}>
      <span style={{ fontSize: theme.font.size.sm, color: theme.font.color.tertiary }}>{label}</span>
      <span style={{ color: color ?? theme.font.color.primary }}>{children}</span>
    </div>
  );
};

const EquationPart = ({ value, label, color }: { value: string; label: string; color?: string }) => {
  const theme = themeCssVariables;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: theme.font.size.lg, fontWeight: theme.font.weight.semiBold, color: color ?? theme.font.color.primary }}>{value}</span>
      <span style={{ fontSize: theme.font.size.sm, color: theme.font.color.tertiary }}>{label}</span>
    </div>
  );
};

// The report of a product, summary first: the totals, the stock graph with the planning dates,
// the reservations, then the breakdown and the sum behind the forecast.
export const ForecastSummaryView = ({
  data,
  text,
  busy,
  onReserve,
  onUnreserve,
}: {
  data: ForecastAnswer;
  text: ForecastSummaryText;
  busy: boolean;
  onReserve: (moveId: string) => void;
  onUnreserve: (moveId: string) => void;
}) => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readPopUpStyles();
  const theme = themeCssVariables;
  const grids = readSummaryGrids();
  const format = makeFormat(locale, data.digits);
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const unitOf = (productId: string) => productById.get(productId)?.uomName ?? '';
  const total = (pick: (product: ForecastProduct) => number) => sum(data.products.map(pick));
  const unit = data.products[0]?.uomName ?? '';
  const onHand = total((product) => product.onHand);
  const incoming = total((product) => product.incoming);
  const outgoing = total((product) => product.outgoing);
  const forecast = total((product) => product.forecast);
  const free = total((product) => product.free);
  const draftIn = total((product) => product.draftIn);
  const draftOut = total((product) => product.draftOut);
  const withPending = forecast + draftIn - draftOut;
  const toRemove = data.useExpirationDate ? total((product) => product.toRemove ?? 0) : null;
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
  const summary = forecastGraphSummary(data.graph);
  const withUnit = (value: number) => `${format(value)} ${unit}`;
  const signColor = (value: number) => (value <= 0 ? theme.color.red : theme.color.green);
  const multipleProducts = data.products.length > 1;

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
        return <span style={{ color: theme.color.orange }}>{t(text.expiredStock)}</span>;
      case 'freeStock':
        return t(text.freeStock);
      default:
        return <span style={styles.muted}>{t(text.notAvailable)}</span>;
    }
  };

  const removalText = (line: ForecastLine) =>
    line.removalDate === null ? null : line.removalDate === 'NOW' ? (
      <span style={{ color: theme.color.orange }}>{t(text.toRemoveNow)}</span>
    ) : (
      <span style={styles.muted}>{t(text.toRemoveOn, { date: formatDay(line.removalDate, locale) })}</span>
    );

  const actionCell = (row: ForecastRow) => {
    const moveId = row.line.moveOutId;

    if (row.action === null || moveId === null || !data.canReserve) {
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

  return (
    <div style={{ ...styles.panel, gap: theme.spacing[4], padding: 0 }}>
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

      <div style={grids.metrics} role="group" aria-label={t(text.summaryLabel)}>
        <Metric color="gray" label={t(text.onHand)} value={format(onHand)} note={t(text.onHandNote)} />
        {toRemove === null ? null : <Metric color="orange" label={t(text.toRemove)} value={format(toRemove)} note={t(text.toRemoveNote)} />}
        <Metric color="gray" label={t(text.incoming)} value={format(incoming)} note={t(text.incomingNote)} />
        <Metric color="red" label={t(text.outgoing)} value={format(outgoing)} note={t(text.outgoingNote)} />
        <Metric color="blue" label={t(text.forecasted)} value={withUnit(forecast)} note={t(text.forecastedNote)} valueColor={forecast < 0 ? theme.color.red : theme.color.blue} />
        <Metric color="green" label={t(text.free)} value={format(free)} note={t(text.freeNote)} valueColor={theme.color.green} />
      </div>

      <div style={grids.graphAndDates}>
        <Panel title={t(text.chartTitle)} note={t(text.chartNote)}>
          <div role="img" aria-label={t(text.chartTitle)}>
            <ForecastGraph graph={data.graph} today={data.today} emptyText={t(text.graphEmpty)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing[4], flexWrap: 'wrap', ...styles.muted }}>
            <span>
              {t(text.earliestChange)}{' '}
              <strong style={{ color: theme.font.color.primary }}>{summary.firstChangeDate === null ? '–' : formatDay(summary.firstChangeDate, locale)}</strong>
            </span>
            <span>
              {t(text.endingStock)}{' '}
              <strong style={{ color: theme.font.color.primary }}>{summary.endingStock === null ? '–' : withUnit(summary.endingStock)}</strong>
            </span>
          </div>
        </Panel>
        {lead === undefined ? null : (
          <Panel title={t(text.planningTitle)} note={t(text.planningNote)} style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[3],
                borderRadius: theme.border.radius.md,
                background: theme.color.transparent.blue3,
              }}
            >
              <span>{t(text.timeToReplenish)}</span>
              <span style={{ color: theme.color.blue, fontWeight: theme.font.weight.semiBold }}>
                {t(text.days, { days: lead.totalDelay })}
                {lead.totalDelay === 0 || arrival === null ? '' : ` (${formatDay(arrival, locale)})`}
              </span>
            </div>
            <div>
              <DetailRow label={t(text.today)} value={formatDay(data.today, locale)} />
              {lead.descriptions.map((description, index) => (
                <DetailRow
                  key={index}
                  label={t(description.label.message, description.label.values)}
                  value={t(description.value.message, description.value.values)}
                />
              ))}
              <DetailRow label={t(text.earliestArrival)} value={arrival === null ? '' : formatDay(arrival, locale)} />
            </div>
          </Panel>
        )}
      </div>

      <Section.Root>
        <Section.Header
          title={t(text.reservationsTitle)}
          description={<span>{t(text.reservationsNote)}</span>}
          adornment={
            <Tag color="gray" preventShrink>
              {t(text.reservationCount, { count: rows.length })}
            </Tag>
          }
        />
        <Card.Root rounded>
          {rows.length === 0 ? (
            <div style={{ ...styles.muted, padding: theme.spacing[3] }}>{t(text.noReservations)}</div>
          ) : (
            <div role="list">
              {rows.map((row, index) => {
                const { line } = row;
                const product = productById.get(line.productId);

                return (
                  <Card.Content key={`${line.productId}-${line.moveInId ?? ''}-${line.moveOutId ?? ''}-${index}`} divider={index < rows.length - 1}>
                    <div
                      role="listitem"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9rem), 1fr))',
                        gap: theme.spacing[3],
                        alignItems: 'center',
                        padding: theme.spacing[3],
                        background: line.isLate ? theme.color.transparent.amber3 : undefined,
                      }}
                    >
                      {multipleProducts && row.startsProduct ? (
                        <div style={{ gridColumn: '1 / -1', fontWeight: theme.font.weight.semiBold }}>{product?.name ?? ''}</div>
                      ) : null}
                      <Field label={t(text.available)}>{availableCell(row)}</Field>
                      <Field
                        label={t(text.outgoing)}
                        color={line.removalDate === 'NOW' ? theme.color.orange : !line.replenishmentFilled ? theme.color.red : undefined}
                      >{`${format(line.quantity)} ${unitOf(line.productId)}`}</Field>
                      <Field label={t(text.usedBy)}>
                        <span style={styles.row}>
                          {documentLink(line.documentOut, line.isMatched ? { fontStyle: 'italic' } : undefined)}
                          {removalText(line)}
                        </span>
                      </Field>
                      <Field label={t(text.deliveryDate)} color={line.deliveryLate ? theme.color.red : undefined}>
                        {line.deliveryDate === null ? '' : formatDay(line.deliveryDate, locale)}
                      </Field>
                      {actionCell(row) === null ? null : <div>{actionCell(row)}</div>}
                    </div>
                  </Card.Content>
                );
              })}
            </div>
          )}
        </Card.Root>
        {data.truncated ? <div style={styles.muted}>{t(text.truncated)}</div> : null}
      </Section.Root>

      <div style={grids.breakdownAndSum}>
        <Panel title={t(text.breakdownTitle)} note={t(text.breakdownNote)}>
          <div>
            <DetailRow label={t(text.freeStock)} note={t(text.freeStockNote)} value={withUnit(free)} valueColor={theme.color.green} />
            <DetailRow label={t(text.forecastedInventory)} note={t(text.forecastedInventoryNote)} value={withUnit(forecast)} valueColor={signColor(forecast)} />
            {draftIn === 0 ? null : <DetailRow label={t(text.incomingDraft)} note={t(text.incomingDraftNote)} value={withUnit(draftIn)} />}
            {draftOut === 0 ? null : <DetailRow label={t(text.outgoingDraft)} note={t(text.outgoingDraftNote)} value={withUnit(-draftOut)} />}
            <DetailRow label={t(text.forecastedWithPending)} note={t(text.forecastedWithPendingNote)} value={withUnit(withPending)} valueColor={signColor(withPending)} />
          </div>
        </Panel>
        <Panel title={t(text.equationTitle)} note={t(text.equationNote)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[3] }}>
            <EquationPart value={format(onHand)} label={t(text.onHand)} />
            {toRemove === null ? null : (
              <>
                <span style={styles.muted}>−</span>
                <EquationPart value={format(toRemove)} label={t(text.toRemove)} />
              </>
            )}
            <span style={styles.muted}>+</span>
            <EquationPart value={format(incoming)} label={t(text.incoming)} />
            <span style={styles.muted}>−</span>
            <EquationPart value={format(outgoing)} label={t(text.outgoing)} />
            <span style={styles.muted}>=</span>
            <EquationPart value={withUnit(forecast)} label={t(text.forecasted)} color={signColor(forecast)} />
          </div>
        </Panel>
      </div>
    </div>
  );
};
