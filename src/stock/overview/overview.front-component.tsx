import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, type MessageDescriptor, msg, navigate, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';
import { Button } from 'twenty-ui/primitives/input';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type OverviewAnswer } from 'src/stock/overview/types/overview-answer.type';
import {
  OVERVIEW_NEW_TRANSFER_ROUTE_PATH,
  OVERVIEW_ROUTE_PATH,
  OVERVIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { OVERVIEW_COUNTS, overviewListQuery } from 'src/stock/utils/overview-counts.util';
import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewTypeCard } from 'src/stock/utils/types/overview-type-card.type';

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
  const shown = OVERVIEW_COUNTS.filter((count) => card.counts[count] > 0);

  return (
    <div style={{ ...styles.card, minWidth: 220 }}>
      <button type="button" style={{ ...styles.link, ...styles.title, textAlign: 'left' }} onClick={() => onOpen(null)}>
        {card.name}
      </button>
      {shown.length === 0 ? <div style={styles.muted}>{t('No open transfers.')}</div> : null}
      {shown.map((count) => (
        <button
          key={count}
          type="button"
          style={{ ...styles.link, display: 'flex', justifyContent: 'space-between', gap: themeCssVariables.spacing[4] }}
          onClick={() => onOpen(count)}
        >
          <span>{t(COUNT_LABELS[count])}</span>
          <span>{card.counts[count]}</span>
        </button>
      ))}
      <div>
        <Button size="sm" variant="outline" disabled={busy} onClick={onCreate}>
          {t('New')}
        </Button>
      </div>
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
      {answer === null && loading ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {answer !== null && answer.warehouses.length === 0 ? <div style={styles.muted}>{t('No active operation types.')}</div> : null}
      {answer?.warehouses.map((warehouse) => (
        <div key={warehouse.warehouseId ?? ''} style={{ display: 'flex', flexDirection: 'column', gap: themeCssVariables.spacing[2] }}>
          <div style={styles.title}>{warehouse.warehouseName ?? t('No warehouse')}</div>
          <div style={styles.row}>
            {warehouse.types.map((card) => (
              <TypeCard
                key={card.id}
                card={card}
                busy={creating}
                onOpen={(count) => void openList(answer, card, count)}
                onCreate={() => void createTransfer(card.id)}
              />
            ))}
          </div>
        </div>
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
