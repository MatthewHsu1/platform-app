import { type CSSProperties, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, type MessageDescriptor, msg, navigate, useTranslate } from 'twenty-sdk/front-component';
import { IconArrowDown, IconArrowUp, IconChevronDown, IconChevronRight, IconSwitchHorizontal } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { Button } from 'twenty-ui/primitives/input';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { SkeletonCard } from 'src/shared/front-components/skeleton-card';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type OverviewAnswer } from 'src/stock/overview/types/overview-answer.type';
import {
  OVERVIEW_NEW_TRANSFER_ROUTE_PATH,
  OVERVIEW_ROUTE_PATH,
  OVERVIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { OVERVIEW_COUNTS, overviewListQuery } from 'src/stock/utils/overview-counts.util';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewTypeCard } from 'src/stock/utils/types/overview-type-card.type';
import { type OverviewWarehouse } from 'src/stock/utils/types/overview-warehouse.type';

// The texts the routes answer, listed here so the extractor puts them in the catalog.
export const OVERVIEW_ROUTE_TEXTS = [msg('Choose an operation type.'), msg('Record not found.')];

const COUNT_LABELS: Record<OverviewCount, MessageDescriptor> = {
  ready: msg('Ready'),
  waiting: msg('Waiting'),
  late: msg('Late'),
  backorders: msg('Backorders'),
  draft: msg('Draft'),
  toProcess: msg('To process'),
};

// How many placeholder cards show while the counts load.
const LOADING_CARDS = 6;

const TYPE_ICONS: Record<PickingTypeCode, typeof IconArrowDown> = {
  INCOMING: IconArrowDown,
  OUTGOING: IconArrowUp,
  INTERNAL: IconSwitchHorizontal,
};

// The layout makes the cards equal: every card is one grid track wide and as
// tall as it is wide. The track minimum is wide enough for a card that shows
// all six counts, and it never exceeds the width of the page.
const readGridStyles = () => {
  const theme = themeCssVariables;
  const cardPadding = theme.spacing[3];
  const rowHeight = theme.spacing[5];
  const headHeight = theme.spacing[8];
  const sectionGap = theme.spacing[2];

  return {
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, calc(${theme.spacing[30]} * 2)), 1fr))`,
      gap: theme.spacing[2],
    } satisfies CSSProperties,
    card: {
      boxSizing: 'border-box',
      aspectRatio: '1 / 1',
      minWidth: 0,
      padding: cardPadding,
      display: 'flex',
      flexDirection: 'column',
      gap: sectionGap,
      border: `1px solid ${theme.border.color.medium}`,
      borderRadius: theme.border.radius.md,
      background: theme.background.secondary,
    } satisfies CSSProperties,
    head: { display: 'flex', alignItems: 'center', gap: theme.spacing[2], minHeight: headHeight } satisfies CSSProperties,
    icon: {
      flex: 'none',
      width: rowHeight,
      height: rowHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${theme.border.color.medium}`,
      borderRadius: theme.border.radius.sm,
      color: theme.font.color.tertiary,
    } satisfies CSSProperties,
    cardTitle: {
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      color: theme.font.color.primary,
      fontWeight: theme.font.weight.medium,
    } satisfies CSSProperties,
    countRow: {
      minHeight: rowHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[4],
      color: theme.font.color.secondary,
    } satisfies CSSProperties,
    countValue: { fontVariantNumeric: 'tabular-nums', fontWeight: theme.font.weight.medium } satisfies CSSProperties,
    footer: { marginTop: 'auto' } satisfies CSSProperties,
    sectionHead: { display: 'flex', alignItems: 'center', gap: theme.spacing[2], color: theme.font.color.primary } satisfies CSSProperties,
    quiet: { background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' } satisfies CSSProperties,
  };
};

// Late reads red, Waiting amber and Ready green; the other counts stay plain.
const readCountColors = (): Partial<Record<OverviewCount, string>> => ({
  ready: themeCssVariables.color.green,
  waiting: themeCssVariables.color.orange,
  late: themeCssVariables.color.red,
});

const TypeCard = ({
  card,
  busy,
  onOpen,
  onCreate,
}: {
  card: OverviewTypeCard;
  busy: boolean;
  onOpen: (count: OverviewCount | null) => void;
  onCreate: () => void;
}) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const grid = readGridStyles();
  const colors = readCountColors();
  const theme = useTheme();
  const shown = OVERVIEW_COUNTS.filter((count) => card.counts[count] > 0);
  const TypeIcon = TYPE_ICONS[card.code];

  return (
    <div style={grid.card}>
      <div style={grid.head}>
        <span style={grid.icon}>
          <TypeIcon size={theme.icon.size.md} />
        </span>
        <button type="button" style={{ ...grid.quiet, ...grid.cardTitle }} title={card.name} onClick={() => onOpen(null)}>
          {card.name}
        </button>
      </div>
      {shown.length === 0 ? <div style={styles.muted}>{t('No open transfers.')}</div> : null}
      {shown.map((count) => (
        <button key={count} type="button" style={{ ...grid.quiet, ...grid.countRow }} onClick={() => onOpen(count)}>
          <span>{t(COUNT_LABELS[count])}</span>
          <span style={{ ...grid.countValue, color: colors[count] ?? themeCssVariables.font.color.primary }}>{card.counts[count]}</span>
        </button>
      ))}
      <div style={grid.footer}>
        <Button size="sm" variant="outline" disabled={busy} onClick={onCreate}>
          {t('New')}
        </Button>
      </div>
    </div>
  );
};

const WarehouseSection = ({
  warehouse,
  busy,
  onOpen,
  onCreate,
}: {
  warehouse: OverviewWarehouse;
  busy: boolean;
  onOpen: (card: OverviewTypeCard, count: OverviewCount | null) => void;
  onCreate: (pickingTypeId: string) => void;
}) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const grid = readGridStyles();
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const Chevron = collapsed ? IconChevronRight : IconChevronDown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: themeCssVariables.spacing[2] }}>
      <button type="button" style={{ ...grid.quiet, ...grid.sectionHead }} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
        <Chevron size={theme.icon.size.sm} color={theme.font.color.tertiary} />
        <span style={styles.title}>{warehouse.warehouseName ?? t('No warehouse')}</span>
        <span style={{ ...styles.muted, fontSize: themeCssVariables.font.size.sm }}>
          {t('{count} operation types', { count: warehouse.types.length })}
        </span>
      </button>
      {collapsed ? null : (
        <div style={grid.grid}>
          {warehouse.types.map((card) => (
            <TypeCard key={card.id} card={card} busy={busy} onOpen={(count) => onOpen(card, count)} onCreate={() => onCreate(card.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const Overview = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const [answer, setAnswer] = useState<OverviewAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  // Only the latest error shows: an older one no longer says what went wrong.
  const [error, setError] = useState<string | null>(null);

  useRunOnce(() => {
    void postAppRoute<OverviewAnswer>(OVERVIEW_ROUTE_PATH, {})
      .then(setAnswer)
      .catch((caught: unknown) => setError(describeRouteError(caught, t('Could not load the overview.'))))
      .finally(() => setLoading(false));
  });

  const openList = async (shown: OverviewAnswer, card: OverviewTypeCard, count: OverviewCount | null) => {
    setError(null);
    const viewId = count === null ? shown.typeViewIds[card.code] : shown.countViewIds[count];

    try {
      await navigate(
        AppPath.RecordIndexPage,
        { objectNamePlural: 'stockPickings' },
        overviewListQuery(count, card.id, viewId, shown.today),
      );
    } catch (caught) {
      setError(describeRouteError(caught, t('Could not open the list.')));
    }
  };

  const createTransfer = async (pickingTypeId: string) => {
    setError(null);
    setCreating(true);
    try {
      const { pickingId } = await postAppRoute<{ pickingId: string }>(OVERVIEW_NEW_TRANSFER_ROUTE_PATH, { pickingTypeId });

      try {
        await navigate(AppPath.RecordShowPage, { objectNameSingular: 'stockPicking', objectRecordId: pickingId });
      } catch (caught) {
        setError(describeRouteError(caught, t('Could not open the transfer.')));
      }
    } catch (caught) {
      setError(describeRouteError(caught, t('Could not create the transfer.')));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      {answer === null && loading ? (
        <div role="status" aria-busy="true" aria-label={t('Loading…')} style={readGridStyles().grid}>
          {Array.from({ length: LOADING_CARDS }, (_, index) => (
            <SkeletonCard key={index} lines={3} />
          ))}
        </div>
      ) : null}
      {answer !== null && answer.warehouses.length === 0 ? <div style={styles.muted}>{t('No active operation types.')}</div> : null}
      {answer?.warehouses.map((warehouse) => (
        <WarehouseSection
          key={warehouse.warehouseId ?? ''}
          warehouse={warehouse}
          busy={creating}
          onOpen={(card, count) => void openList(answer, card, count)}
          onCreate={(pickingTypeId) => void createTransfer(pickingTypeId)}
        />
      ))}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: OVERVIEW_UNIVERSAL_IDENTIFIERS.frontComponent,
  name: 'platform-stock-overview',
  description: 'Inventory overview: the operation types with their counts of open transfers.',
  component: Overview,
});
