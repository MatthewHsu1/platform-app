import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, type MessageDescriptor, msg, navigate, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';
import { Button } from 'twenty-ui/primitives/input';

import { ErrorText, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type OverviewAnswer } from 'src/stock/overview/types/overview-answer.type';
import {
  OVERVIEW_NEW_TRANSFER_ROUTE_PATH,
  OVERVIEW_ROUTE_PATH,
  OVERVIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { OVERVIEW_COUNT_STATES, OVERVIEW_COUNTS } from 'src/stock/utils/overview-counts.util';
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

// The list opens with the operation type and the count's states as filter
// chips; a count with a saved list opens inside that list.
const countQuery = (viewId: string | undefined, typeId: string, count: OverviewCount) => ({
  ...(viewId === undefined ? {} : { viewId }),
  filter: { state: { IS: OVERVIEW_COUNT_STATES[count] }, pickingType: { IS: { selectedRecordIds: [typeId] } } },
});

const TypeCard = ({
  card,
  busy,
  onOpen,
  onCreate,
}: {
  card: OverviewTypeCard;
  busy: boolean;
  onOpen: (count: OverviewCount) => void;
  onCreate: () => void;
}) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const shown = OVERVIEW_COUNTS.filter((count) => card.counts[count] > 0);

  return (
    <div style={{ ...styles.card, minWidth: 220 }}>
      <div style={styles.title}>{card.name}</div>
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
  const loading = usePopUpCall(t('Could not load the overview.'));
  const creating = usePopUpCall(t('Could not create the transfer.'));
  const [answer, setAnswer] = useState<OverviewAnswer | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useRunOnce(() => {
    void loading.call<OverviewAnswer>(OVERVIEW_ROUTE_PATH, {}).then((next) => {
      if (next !== null) {
        setAnswer(next);
      }
    });
  });

  const openCount = async (typeId: string, count: OverviewCount) => {
    setOpenError(null);
    try {
      await navigate(AppPath.RecordIndexPage, { objectNamePlural: 'stockPickings' }, countQuery(answer?.viewIds[count], typeId, count));
    } catch {
      setOpenError(t('Could not open the list.'));
    }
  };

  const createTransfer = async (pickingTypeId: string) => {
    setOpenError(null);
    const created = await creating.call<{ pickingId: string }>(OVERVIEW_NEW_TRANSFER_ROUTE_PATH, { pickingTypeId });

    if (created === null) {
      return;
    }
    try {
      await navigate(AppPath.RecordShowPage, { objectNameSingular: 'stockPicking', objectRecordId: created.pickingId });
    } catch {
      setOpenError(t('Could not open the transfer.'));
    }
  };

  return (
    <div style={styles.panel}>
      <ErrorText error={loading.error ?? creating.error ?? openError} />
      {answer === null && loading.busy ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {answer !== null && answer.warehouses.length === 0 ? <div style={styles.muted}>{t('No active operation types.')}</div> : null}
      {(answer?.warehouses ?? []).map((warehouse) => (
        <div key={warehouse.warehouseId ?? ''} style={{ display: 'flex', flexDirection: 'column', gap: themeCssVariables.spacing[2] }}>
          <div style={styles.title}>{warehouse.warehouseName ?? t('No warehouse')}</div>
          <div style={styles.row}>
            {warehouse.types.map((card) => (
              <TypeCard
                key={card.id}
                card={card}
                busy={creating.busy}
                onOpen={(count) => void openCount(card.id, count)}
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
