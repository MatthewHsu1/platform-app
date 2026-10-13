import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useLocale, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { checkSelection } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { DataTable } from 'src/shared/front-components/data-table';
import { closePopUp, ErrorText, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { formatDay } from 'src/shared/front-components/utils/format-day.util';
import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { PrintNow } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import {
  RECEPTION_ALLOCATE_ROUTE_PATH,
  RECEPTION_ROUTE_PATH,
  RECEPTION_UNALLOCATE_ROUTE_PATH,
  RECEPTION_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { type ReceptionLine } from 'src/stock/utils/types/reception-line.type';
import { type ReceptionSource } from 'src/stock/utils/types/reception-source.type';

// The texts the routes answer, listed here so the extractor puts them in the catalog.
export const RECEPTION_ROUTE_TEXTS = [
  msg('Choose the delivery moves, their quantities and the incoming moves.'),
  msg('Move not found.'),
  msg('The quantity must be more than zero and at most the demand of the delivery move.'),
  msg("You cannot unreserve a stock move that has been set to 'Done'."),
  msg('No transfers selected or a delivery order selected'),
  msg('This report cannot be used for done and not done transfers at the same time'),
];

const RECEPTION_PRINT_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Reception Report') };
const RECEPTION_LABELS_PRINT_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open the reception labels') };

type ReceptionAnswer = {
  sources: ReceptionSource[];
  canAllocate: boolean;
  products: Record<string, { name: string; uomName: string }>;
  urgentPickingIds: string[];
  digits: number;
};

// The report, all allocated labels, or the labels of some delivery moves only.
type Printing = { report: 'receptionReport' } | { report: 'receptionReportLabels'; moveIds: string[] | null };

const formatQuantity = (quantity: number, digits: number, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(quantity);
  } catch {
    return String(quantity);
  }
};

// The reception report of the selected transfers or batch, or of the
// transfers given: what incoming goods can go to waiting deliveries, and
// buttons to allocate them or take them off again.
export const ReceptionReport = ({ pickingIds }: { pickingIds?: string[] }) => {
  const { t } = useTranslate();
  const locale = useLocale();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const objectName = useSelectedObjectMetadata()?.nameSingular;
  const changing = usePopUpCall(t('Could not change the allocation.'));
  const loadFailed = t('Could not load the reception report.');
  const [answer, setAnswer] = useState<ReceptionAnswer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [printing, setPrinting] = useState<Printing | null>(null);
  const isBatch = pickingIds === undefined && objectName === 'stockPickingBatch';
  const ids = pickingIds ?? selectedIds;
  const requestKey = JSON.stringify(isBatch ? { batchId: ids[0] ?? null } : { pickingIds: ids });

  useEffect(() => {
    // An answer to a request the view has since moved past is dropped.
    let isCurrent = true;

    void postAppRoute<ReceptionAnswer>(RECEPTION_ROUTE_PATH, JSON.parse(requestKey) as Record<string, unknown>)
      .then((next) => {
        if (isCurrent) {
          setAnswer(next);
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (isCurrent) {
          setLoadError(describeRouteError(caught, loadFailed));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [requestKey, version, loadFailed]);

  const reload = () => setVersion((current) => current + 1);

  const allocate = async (lines: ReceptionLine[]) => {
    const done = await changing.call(RECEPTION_ALLOCATE_ROUTE_PATH, {
      moveIds: lines.map((line) => line.moveOutId),
      quantities: lines.map((line) => line.quantity),
      inIds: lines.map((line) => line.moveInIds),
    });

    if (done !== null) {
      reload();
    }
  };

  const unallocate = async (line: ReceptionLine) => {
    const done = await changing.call(RECEPTION_UNALLOCATE_ROUTE_PATH, {
      moveId: line.moveOutId,
      quantity: line.quantity,
      inIds: line.moveInIds,
    });

    if (done !== null) {
      reload();
    }
  };

  const selectionMessage = checkSelection(ids.length, 'many');
  if (selectionMessage !== null) {
    return (
      <div style={styles.panel}>
        <div>{t(selectionMessage)}</div>
      </div>
    );
  }
  if (printing !== null) {
    return (
      <PrintNow
        report={printing.report}
        text={printing.report === 'receptionReport' ? RECEPTION_PRINT_TEXT : RECEPTION_LABELS_PRINT_TEXT}
        objectSingular={isBatch ? 'stockPickingBatch' : 'stockPicking'}
        recordIds={isBatch ? ids.slice(0, 1) : ids}
        options={
          printing.report === 'receptionReport'
            ? {}
            : { allocatedOnly: true, ...(printing.moveIds === null ? {} : { moveIds: printing.moveIds }) }
        }
        onClose={() => setPrinting(null)}
      />
    );
  }
  const busy = changing.busy;
  const canAllocate = answer?.canAllocate === true;
  const toAllocate = (answer?.sources ?? []).flatMap((source) =>
    source.lines.filter((line) => line.isQtyAssignable && !line.isAssigned && line.moveInIds.length > 0),
  );
  const product = (line: ReceptionLine) => answer?.products[line.productId];
  // The labels of the allocated lines given: one delivery's, or one line's.
  const printLabelsOf = (lines: ReceptionLine[]) =>
    setPrinting({ report: 'receptionReportLabels', moveIds: [...new Set(lines.filter((line) => line.isAssigned).map((line) => line.moveOutId))] });
  const hasAllocated = (answer?.sources ?? []).some((source) => source.lines.some((line) => line.isAssigned));

  return (
    <div style={styles.panel}>
      <div style={styles.row}>
        <div style={styles.title}>{t('Allocation')}</div>
        {canAllocate ? (
          <Button size="sm" variant="solid" color="accent" disabled={busy || toAllocate.length === 0} onClick={() => void allocate(toAllocate)}>
            {t('Allocate All')}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrinting({ report: 'receptionReport' })}>
          {t('Print')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !hasAllocated} onClick={() => setPrinting({ report: 'receptionReportLabels', moveIds: null })}>
          {t('Print Labels')}
        </Button>
      </div>
      <ErrorText error={loadError ?? changing.error} />
      {answer === null && loadError === null ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {answer !== null && answer.sources.length === 0 ? <div>{t('Nothing to allocate.')}</div> : null}
      {(answer?.sources ?? []).map((source) => (
        <div key={source.pickingId} style={styles.card}>
          <div style={styles.row}>
            <div style={styles.title}>
              {answer?.urgentPickingIds.includes(source.pickingId) === true ? '★ ' : ''}
              {source.pickingName}
            </div>
            {source.lines.some((line) => line.moveInIds.length > 0) ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !source.lines.some((line) => line.isAssigned)}
                onClick={() => printLabelsOf(source.lines)}
              >
                {t('Print Labels')}
              </Button>
            ) : null}
          </div>
          {source.scheduledDate === null ? null : (
            <div style={styles.muted}>{t('Expected delivery: {date}', { date: formatDay(source.scheduledDate, locale) })}</div>
          )}
          <DataTable<ReceptionLine>
            rowKey={(line, index) => `${line.moveOutId}-${index}`}
            rows={source.lines}
            columns={[
              { key: 'product', title: t('Product'), render: (line) => product(line)?.name ?? '' },
              {
                key: 'quantity',
                title: t('Quantity'),
                render: (line) => `${formatQuantity(line.quantity, answer?.digits ?? 2, locale)} ${product(line)?.uomName ?? ''}`,
              },
              {
                key: 'action',
                title: '',
                render: (line) =>
                  !line.isQtyAssignable ? (
                    <span style={styles.muted}>{t('Draft')}</span>
                  ) : !canAllocate ? null : line.isAssigned ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void unallocate(line)}>
                      {t('Unallocate')}
                    </Button>
                  ) : (
                    <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void allocate([line])}>
                      {t('Allocate')}
                    </Button>
                  ),
              },
              {
                key: 'label',
                title: '',
                render: (line) =>
                  line.isQtyAssignable ? (
                    <Button size="sm" variant="outline" disabled={busy || !line.isAssigned} onClick={() => printLabelsOf([line])}>
                      {t('Print Label')}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      ))}
      {pickingIds === undefined ? (
        <div style={styles.buttons}>
          <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
            {t('Close')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const ReceptionWidget = () => <ReceptionReport />;

export default defineFrontComponent({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.widget,
  name: 'platform-stock-reception-report',
  description: 'Reception report: allocates incoming quantities to waiting deliveries, or takes them off again.',
  component: ReceptionWidget,
});
