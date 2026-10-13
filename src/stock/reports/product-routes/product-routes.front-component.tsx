import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ErrorText, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type ProductRoutesAnswer } from 'src/stock/reports/product-routes/types/product-routes-answer.type';
import { PRODUCT_ROUTES_ROUTE_PATH, PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { routeRowSegments, ruleSegmentMarks } from 'src/stock/utils/product-routes-report.util';
import { type RoutesReportRow } from 'src/stock/utils/types/routes-report-row.type';
import { type RuleSegmentMark } from 'src/stock/utils/types/rule-segment-mark.type';

// The texts the route answers, listed here so the extractor puts them in the catalog.
export const PRODUCT_ROUTES_ROUTE_TEXTS = [msg('Choose a product.'), msg('Record not found.'), msg('Please create a warehouse first.')];

// One colour per route, taken in turn.
const ROUTE_COLOR_NAMES = ['orange', 'purple', 'green', 'cyan', 'blue', 'red', 'grass'] as const;

const MARK_SIZE = 12;

const Mark = ({ mark, color }: { mark: RuleSegmentMark; color: string }) => (
  <svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
    {mark === 'RIGHT' ? <polygon points="0,0 0,10 10,5" style={{ fill: color, stroke: color }} /> : null}
    {mark === 'LEFT' ? <polygon points="0,5 10,10 10,0" style={{ fill: color, stroke: color }} /> : null}
    {mark === 'POINTS' ? (
      <>
        <line x1="1" y1="5" x2="4.5" y2="5" style={{ stroke: color }} />
        <line x1="5.5" y1="5" x2="9" y2="5" style={{ stroke: color }} />
      </>
    ) : null}
    {mark === 'BAR' ? <line x1="5" y1="0" x2="5" y2="10" style={{ stroke: color }} /> : null}
  </svg>
);

// A rule's line between its two locations, with the symbols for its kind of rule.
const RuleLine = ({
  marks,
  color,
  label,
  title,
}: {
  marks: { before: RuleSegmentMark[]; after: RuleSegmentMark[] };
  color: string;
  label: string;
  title?: string;
}) => (
  <div title={title} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {marks.before.map((mark, index) => (
        <Mark key={`before-${index}`} mark={mark} color={color} />
      ))}
      <div style={{ flex: 1, minWidth: 24, height: 2, background: color }} />
      {marks.after.map((mark, index) => (
        <Mark key={`after-${index}`} mark={mark} color={color} />
      ))}
    </div>
    {label.length > 0 ? <div style={{ color, textAlign: 'center', fontSize: themeCssVariables.font.size.sm }}>{label}</div> : null}
  </div>
);

const RuleRow = ({ row }: { row: RoutesReportRow }) => {
  const styles = readPopUpStyles();
  const color = themeCssVariables.color[ROUTE_COLOR_NAMES[row.colorIndex % ROUTE_COLOR_NAMES.length]];

  return (
    <tr>
      {routeRowSegments(row.cells).map((segment, index) => (
        <td key={index} colSpan={segment.span} style={styles.cell}>
          {segment.cell === null ? null : (
            <RuleLine
              marks={ruleSegmentMarks(segment.cell.kind, row.action, row.procureMethod)}
              color={color}
              label={row.pickingTypeName ?? ''}
              title={row.routeName}
            />
          )}
        </td>
      ))}
    </tr>
  );
};

const ProductRoutes = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const templateId = selectedIds.length === 1 ? selectedIds[0] : null;
  const { busy, error, call } = usePopUpCall(t('Could not load the product routes.'));
  const [answer, setAnswer] = useState<ProductRoutesAnswer | null>(null);

  const load = async (choice: { productId?: string | null; warehouseIds?: string[] }) => {
    if (templateId === null) {
      return;
    }
    const next = await call<ProductRoutesAnswer>(PRODUCT_ROUTES_ROUTE_PATH, { productTemplateId: templateId, ...choice });

    if (next !== null) {
      setAnswer(next);
    }
  };

  useRunOnce(() => void load({}));

  if (templateId === null) {
    return (
      <div style={styles.panel}>
        <ErrorText error={t('Choose a product.')} />
      </div>
    );
  }

  const toggleWarehouse = (warehouseId: string, checked: boolean) => {
    if (answer === null) {
      return;
    }
    const chosen = answer.chosenWarehouseIds;
    const next = checked ? [...chosen, warehouseId] : chosen.filter((id) => id !== warehouseId);

    void load({ productId: answer.variantId, warehouseIds: next });
  };

  const legendColor = themeCssVariables.font.color.primary;
  const legend: { label: string; marks: { before: RuleSegmentMark[]; after: RuleSegmentMark[] } }[] = [
    { label: t('Push Rule'), marks: { before: ['RIGHT'], after: [] } },
    { label: t('Pull Rule'), marks: { before: [], after: ['RIGHT'] } },
    { label: t('Trigger Another Rule'), marks: { before: ['POINTS'], after: [] } },
    { label: t('Trigger Another Rule If No Stock'), marks: { before: ['POINTS', 'BAR'], after: [] } },
  ];
  const variantName = answer?.variants.find((variant) => variant.id === answer.variantId)?.name ?? '';

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t('Product Routes Report')}</div>
      <ErrorText error={error} />
      {answer === null ? (
        busy ? <div style={styles.muted}>{t('Loading…')}</div> : null
      ) : (
        <>
          <div style={styles.row}>
            {answer.variants.length > 1 ? (
              <ChoiceSelect
                title={t('Product')}
                value={answer.variantId ?? ''}
                options={answer.variants.map((variant) => ({ value: variant.id, label: variant.name }))}
                disabled={busy}
                onChange={(productId) => void load({ productId, warehouseIds: answer.chosenWarehouseIds })}
              />
            ) : (
              <div style={styles.title}>{variantName}</div>
            )}
          </div>
          {answer.warehouses.length > 1 ? (
            <div style={styles.row}>
              <span style={styles.muted}>{t('Warehouses')}</span>
              {answer.warehouses.map((warehouse) => {
                const checked = answer.chosenWarehouseIds.includes(warehouse.id);

                return (
                  <label key={warehouse.id} style={styles.row}>
                    <input
                      type="checkbox"
                      checked={checked}
                      // At least one warehouse stays chosen.
                      disabled={busy || (checked && answer.chosenWarehouseIds.length === 1)}
                      onChange={(event) => toggleWarehouse(warehouse.id, event.target.checked)}
                    />
                    {warehouse.name}
                  </label>
                );
              })}
            </div>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {answer.report.locations.map((location) => {
                    const header = answer.report.headers[location.id];

                    return (
                      <th key={location.id} style={{ ...styles.headerCell, verticalAlign: 'top' }}>
                        <div>{location.name}</div>
                        {(header?.putaway ?? []).map((putaway) => (
                          <div key={putaway.id} style={styles.muted}>
                            {t('Putaway: {location}', { location: putaway.locationOutName })}
                          </div>
                        ))}
                        {(header?.orderpoint ?? []).map((orderpoint) => (
                          <div key={orderpoint.id} style={styles.muted}>
                            <div>[{orderpoint.name}]</div>
                            <div>{t('min: {min}, max: {max}', { min: orderpoint.productMinQty, max: orderpoint.productMaxQty })}</div>
                          </div>
                        ))}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {answer.report.rows.map((row) => (
                  <RuleRow key={row.ruleId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.title}>{t('Legend')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: themeCssVariables.spacing[1] }}>
            {legend.map((item) => (
              <div key={item.label} style={styles.row}>
                <div style={{ width: 200 }}>{item.label}</div>
                <div style={{ width: 80 }}>
                  <RuleLine marks={item.marks} color={legendColor} label="" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS.frontComponent,
  name: 'platform-stock-product-routes',
  description: 'Product Routes Report: how the product moves between locations in the chosen warehouses.',
  component: ProductRoutes,
});
