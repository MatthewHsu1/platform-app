import { useEffect, useRef, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useLocale, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { selectOneRecord } from 'src/shared/front-components/selection-check';
import { type BasedOn } from 'src/stock/orderpoint/types/based-on.type';
import { type ReplenishmentInfo } from 'src/stock/orderpoint/types/replenishment-info.type';
import { type ResupplyOption } from 'src/stock/orderpoint/types/resupply-option.type';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { formatDay } from 'src/shared/front-components/utils/format-day.util';
import { readStockStyles } from 'src/stock/stock-theme';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

// The reordering rule routes answer these texts in the user's language. The
// translation extractor reads only front-component files, so they are listed
// here to reach the catalog; each must match its route's source text exactly.
export const ORDERPOINT_ROUTE_TEXTS = [
  msg('You can not create a snoozed orderpoint that is not manually triggered.'),
  msg(
    "You can only snooze manual orderpoints. You should rather archive 'auto-trigger' orderpoints if you do not want them to be triggered.",
  ),
  msg('Please create a warehouse for company {company}.'),
  msg('The minimum quantity must be less than or equal to the maximum quantity.'),
  msg('A replenishment rule already exists for this product on this location.'),
  msg('There is nothing to order.'),
  msg('Automate applies to manual reordering rules with a quantity to order.'),
  msg('Reordering rule not found.'),
  msg('Not ordered: {rules}.'),
  msg('The quantities to order of these rules are brought up to date shortly.'),
  msg('The inter-warehouse transfers have been generated'),
  msg('Replenishment ordered.'),
  msg('Replenishment is only available for inventory-managed products.'),
  msg('The following replenishment order have been generated'),
  msg('Manual Replenishment'),
  msg('Product not found.'),
  msg('The quantity to replenish cannot be negative.'),
  msg(
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} {unit} on {transfer}. Check it before you confirm again.',
  ),
  msg(
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} {unit}. Check it before you confirm again.',
  ),
  msg(
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} on {transfer}. Check it before you confirm again.',
  ),
  msg('An earlier Replenish of this product had stopped and has now been finished: {quantity}. Check it before you confirm again.'),
  msg(
    'An earlier Replenish of this product had stopped and has now been finished. Check its transfers before you confirm again.',
  ),
  msg('Enter a quantity and a scheduled date, and choose the unit, warehouse and route from the lists offered.'),
  msg('{warehouse} can only provide {freeQty} {uom}, while the quantity to order is {qtyToOrder} {uom}.'),
  msg('Quantity to order reset to the computed quantity.'),
  msg('Reordering rules snoozed.'),
  msg('Choose a snooze date.'),
  msg('Minimum and maximum saved.'),
  msg('Enter a minimum and a maximum quantity.'),
  msg('Route set on the reordering rule.'),
  msg('Choose one of the warehouses offered to resupply this reordering rule.'),
  msg('Replenishment issue: {product}'),
  msg('Replenishment Report'),
  msg('Reordering rule {rule} was not run: the rules ordered with it fail together, though none fails alone.'),
  msg('Delay on {rule}'),
  msg('Time Horizon'),
  msg('+ {days} day(s)'),
];

// Texts many stock routes answer: a record another run holds, a supply chain
// that cannot be planned, and a step the user's role does not allow. Listed
// here for the same reason; each must match its source text exactly.
export const SHARED_ROUTE_TEXTS = [
  msg('This record is being processed. Try again in a moment.'),
  msg('No rule has been found to replenish "{product}" in "{location}".\nVerify the routes configuration on the product.'),
  msg("Invalid rule's configuration, the following rule causes an endless loop: {rule}"),
  msg('No source location defined on stock rule: {rule}!'),
  msg('Product {product} was not found.'),
  msg('Your role does not allow this.'),
];

// The graph is read again this long after the last change, not on every keystroke.
const RELOAD_DELAY_MS = 400;

type GraphInputs = { basedOn: BasedOn; percentFactor: string; min: string; max: string };

// The typed text is kept as typed, so "0." or "1," can still be completed.
const parseQuantity = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));

  return text.trim().length > 0 && Number.isFinite(value) ? value : null;
};

// The stock curve between min and max, with the min and max lines. The last
// fall is dashed: it is the next order, not yet placed.
const ReplenishmentGraph = ({ graph }: { graph: ReplenishmentInfo['graph'] }) => {
  const theme = themeCssVariables;
  const width = 360;
  const height = 140;
  const left = 40;
  const low = Math.min(graph.productMinQty * 0.9, graph.productMinQty);
  const high = Math.max(graph.productMaxQty * 1.1, low + 1);
  const y = (value: number) => 10 + (height - 20) * (1 - (value - low) / (high - low));
  const columns = graph.curve.length > 0 ? 3 : 1;
  const x = (column: number) => left + ((width - left - 10) * column) / columns;
  const points = graph.curve.map((value, index) => ({ x: x(Math.ceil(index / 2)), y: y(value) }));
  const solid = points.slice(0, -1);
  const last = points.slice(-2);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img">
      {[graph.productMaxQty, graph.productMinQty].map((value, index) => (
        <g key={index}>
          <line x1={left} x2={x(columns)} y1={y(value)} y2={y(value)} stroke={index === 0 ? theme.color.blue : theme.color.orange} />
          <text x={left - 4} y={y(value) + 4} textAnchor="end" fill={theme.font.color.tertiary} fontSize={theme.font.size.xs}>
            {value}
          </text>
        </g>
      ))}
      {solid.length > 1 && (
        <polyline
          points={solid.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={theme.font.color.primary}
          strokeWidth={2}
        />
      )}
      {last.length === 2 && (
        <line
          x1={last[0].x}
          y1={last[0].y}
          x2={last[1].x}
          y2={last[1].y}
          stroke={theme.font.color.primary}
          strokeWidth={2}
          strokeDasharray="6 6"
        />
      )}
    </svg>
  );
};

const ReplenishmentInformation = () => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readStockStyles();
  const theme = themeCssVariables;
  const { id: orderpointId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());
  const { busy, error, call } = usePopUpCall(t('Could not read the replenishment information.'));
  const [info, setInfo] = useState<ReplenishmentInfo | null>(null);
  const [basedOn, setBasedOn] = useState<BasedOn>('ONE_MONTH');
  const [percentFactor, setPercentFactor] = useState('100');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [lowOption, setLowOption] = useState<ResupplyOption | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReload = useRef(0);

  useRunOnce(() => {
    if (orderpointId === null) {
      return;
    }
    void call<ReplenishmentInfo>(ORDERPOINT_ROUTE_PATHS.replenishmentInfo, { orderpointId }).then((next) => {
      if (next !== null) {
        setInfo(next);
        setMin(String(next.productMinQty));
        setMax(String(next.productMaxQty));
      }
    });
  });

  const cancelReload = () => {
    if (reloadTimer.current !== null) {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = null;
    }
  };

  // The graph follows the period, the factor, min and max as they are typed;
  // nothing is saved until Save. Only the latest answer is shown: an older
  // one can arrive after it.
  const scheduleReload = (changes: Partial<GraphInputs>) => {
    const inputs = { basedOn, percentFactor, min, max, ...changes };
    const typedMax = parseQuantity(inputs.max);

    cancelReload();
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      const request = latestReload.current + 1;

      latestReload.current = request;
      void call<ReplenishmentInfo>(ORDERPOINT_ROUTE_PATHS.replenishmentInfo, {
        orderpointId,
        basedOn: inputs.basedOn,
        percentFactor: parseQuantity(inputs.percentFactor) ?? 100,
        productMinQty: parseQuantity(inputs.min),
        productMaxQty: typedMax,
      }).then((next) => {
        if (next === null || request !== latestReload.current) {
          return;
        }
        setInfo(next);
        // A max below min is raised to min, so Save sends what the graph shows.
        if (typedMax !== null && next.graph.productMaxQty > typedMax) {
          setMax((current) => (current === inputs.max ? String(next.graph.productMaxQty) : current));
        }
      });
    }, RELOAD_DELAY_MS);
  };

  const close = () => {
    cancelReload();
    closePopUp();
  };

  useEffect(() => cancelReload, []);

  const save = async () => {
    cancelReload();
    const result = await call<{ message: string }>(ORDERPOINT_ROUTE_PATHS.replenishmentInfoSave, {
      orderpointId,
      productMinQty: parseQuantity(min),
      productMaxQty: parseQuantity(max),
    });

    if (result !== null) {
      await finishWith(result.message);
    }
  };

  const choose = async (option: ResupplyOption, orderAvailable: boolean) => {
    cancelReload();
    const result = await call<{ message: string }>(ORDERPOINT_ROUTE_PATHS.replenishmentInfoChoose, {
      orderpointId,
      routeId: option.routeId,
      orderAvailable,
    });

    if (result !== null) {
      await finishWith(result.message);
    }
  };

  if (orderpointId === null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }
  if (info === null) {
    return <ClosablePanel message={busy ? t('Loading…') : null} error={error} busy={busy} closeLabel={t('Close')} />;
  }
  const unit = info.uomName;

  if (lowOption !== null) {
    return (
      <PopupPanel title={t('Quantity available too low')}>
        <div>
          {t('{warehouse} can only provide {freeQty} {uom}, while the quantity to order is {qtyToOrder} {uom}.', {
            warehouse: lowOption.warehouseName,
            freeQty: lowOption.freeQty,
            uom: unit,
            qtyToOrder: info.leadDays.qtyToOrder,
          })}
        </div>
        <ErrorText error={error} />
        <div style={styles.buttons}>
          {lowOption.freeQty > 0 && (
            <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void choose(lowOption, true)}>
              {t('Order {quantity} {uom}', { quantity: lowOption.freeQty, uom: unit })}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void choose(lowOption, false)}>
            {t('Order {quantity} {uom}', { quantity: info.leadDays.qtyToOrder, uom: unit })}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setLowOption(null)}>
            {t('Cancel')}
          </Button>
        </div>
      </PopupPanel>
    );
  }
  const graph = info.graph;
  const marks = [1, 2, 3].map((index) => t('In {days} day(s)', { days: index * graph.orderingPeriod }));
  const muted = { color: theme.font.color.tertiary };

  return (
    <PopupPanel title={t('Replenishment Information for {product} in {warehouse}', { product: info.productName, warehouse: info.warehouseName })}>
      <div style={muted}>
        {t('If the stock expected on the forecasted date is below the minimum ({min} {unit}), stock is replenished up to the maximum ({max} {unit}).', {
          min: info.productMinQty,
          max: info.productMaxQty,
          unit,
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <div style={styles.title}>{t('Forecasted Date')}</div>
        {info.leadDays.lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
            <div style={styles.row}>
              <span>{t('Today')}</span>
              <span>{formatDay(info.leadDays.today, locale)}</span>
            </div>
            {info.leadDays.lines.map((line, index) => (
              <div key={index} style={styles.row}>
                <span>{line.label}</span>
                <span>{line.value}</span>
              </div>
            ))}
            <div style={styles.row}>
              <span>{t('Forecasted Date')}</span>
              <span>= {info.leadDays.leadHorizonDate === null ? '' : formatDay(info.leadDays.leadHorizonDate, locale)}</span>
            </div>
          </div>
        )}
        <div style={muted}>
          {t('Forecast: {forecast} {unit} · To order: {toOrder} {unit}', {
            forecast: info.leadDays.qtyForecast,
            toOrder: info.leadDays.qtyToOrder,
            unit,
          })}
        </div>
        {info.leadDays.virtual && <div style={muted}>{t('This rule was suggested by the replenishment screen.')}</div>}
      </div>
      <div style={styles.title}>{t('Min - Max')}</div>
      <FieldRow label={t('Based on')}>
        <div style={styles.row}>
          <ChoiceSelect
            value={basedOn}
            onChange={(value) => {
              setBasedOn(value);
              scheduleReload({ basedOn: value });
            }}
            options={[
              { value: 'ONE_WEEK', label: t('Last 7 days') },
              { value: 'ONE_MONTH', label: t('Last 30 days') },
              { value: 'THREE_MONTHS', label: t('Last 3 months') },
              { value: 'ONE_YEAR', label: t('Last 12 months') },
              { value: 'LAST_YEAR', label: t('Same month last year') },
              { value: 'LAST_YEAR_2', label: t('Next month last year') },
              { value: 'LAST_YEAR_3', label: t('After next month last year') },
              { value: 'LAST_YEAR_QUARTER', label: t('Last year quarter') },
            ]}
          />
          <span>×</span>
          <Input
            type="number"
            step="1"
            value={percentFactor}
            onValueChange={(value) => {
              setPercentFactor(value);
              scheduleReload({ percentFactor: value });
            }}
          />
          <span>%</span>
        </div>
      </FieldRow>
      <FieldRow label={t('Min')}>
        <div style={styles.row}>
          <Input
            type="number"
            step="any"
            value={min}
            onValueChange={(value) => {
              setMin(value);
              scheduleReload({ min: value });
            }}
          />
          <span>{unit}</span>
        </div>
      </FieldRow>
      <FieldRow label={t('Max')}>
        <div style={styles.row}>
          <Input
            type="number"
            step="any"
            value={max}
            onValueChange={(value) => {
              setMax(value);
              scheduleReload({ max: value });
            }}
          />
          <span>{unit}</span>
        </div>
      </FieldRow>
      <ReplenishmentGraph graph={graph} />
      {graph.orderingPeriod > 0 && (
        <div style={{ ...styles.row, justifyContent: 'space-around', ...muted }}>
          {marks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      )}
      <div style={muted}>
        <div>{t('Daily Demand: {demand} {unit}/day', { demand: graph.dailyDemand, unit })}</div>
        <div>{t('Average Stock: {stock} {unit}', { stock: graph.averageStock, unit })}</div>
        <div>
          {graph.productMinQty === graph.productMaxQty
            ? t('Ordering Frequency: On demand')
            : t('Ordering Frequency: {days} day(s)', { days: graph.orderingPeriod })}
        </div>
        <div>{t('Lead Time: {days} day(s)', { days: graph.leadTime })}</div>
      </div>
      {info.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <div style={styles.title}>{t('Warehouses')}</div>
          {info.options.map((option) => (
            <div key={option.routeId} style={styles.row}>
              <span>{option.warehouseName}</span>
              <span style={muted}>{option.locationName}</span>
              <span style={option.tooLow ? styles.error : undefined}>
                {option.freeQty} {unit}
              </span>
              <span>{option.routeName}</span>
              <span>{t('{days} days', { days: option.leadTime })}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => (option.tooLow ? setLowOption(option) : void choose(option, false))}
              >
                {t('Select Route')}
              </Button>
            </div>
          ))}
        </div>
      )}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void save()}>
          {t('Save')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={close}>
          {t('Close')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.replenishmentInfo,
  name: 'stock-orderpoint-replenishment-info',
  description: 'Shows why a reordering rule orders what it orders and lets the person change min, max and the resupply route.',
  component: ReplenishmentInformation,
});
