import { useState } from 'react';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { toIsoDateTime, toLocalDateTime } from 'src/shared/front-components/utils/local-date-time.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { type ApplyCountsText } from 'src/stock/quant/types/apply-counts-text.type';
import { type CountQuantView } from 'src/stock/quant/types/count-quant-view.type';
import { type CountRouteResult } from 'src/stock/quant/types/count-route-result.type';
import { type CountRowsText } from 'src/stock/quant/types/count-rows-text.type';
import { queryAsUser } from 'src/stock/stock-front-graphql';
import { readStockStyles } from 'src/stock/stock-theme';
import { APPLY_INVENTORY_ROUTE_PATH } from 'src/stock/stock-universal-identifiers.constant';
import { type ConflictAnswer } from 'src/stock/utils/types/conflict-answer.type';

// The translation extractor reads only front-component files: these parts show the text their caller hands them.

// The default reference is record data, typed into the moves as it stands.
const DEFAULT_ADJUSTMENT_NAME = 'Physical Inventory';

type QuantViewNode = {
  id: string;
  quantity: number;
  inventoryQuantity: number | null;
  inventoryDiffQuantity: number | null;
  product: { name: string | null } | null;
  location: { completeName: string | null; name: string | null } | null;
};

export const readQuantViewsAsUser = async (ids: string[]): Promise<CountQuantView[]> => {
  if (ids.length === 0) {
    return [];
  }
  const data = await queryAsUser<{ stockQuants: { edges: { node: QuantViewNode }[] } }>(
    `query CountRows($ids: [UUID!]) {
      stockQuants(filter: { id: { in: $ids } }, first: 200) {
        edges { node { id quantity inventoryQuantity inventoryDiffQuantity product { name } location { completeName name } } }
      }
    }`,
    { ids },
  );

  return data.stockQuants.edges.map(({ node }) => ({
    id: node.id,
    productName: node.product?.name ?? '',
    locationName: textOrNull(node.location?.completeName) ?? node.location?.name ?? '',
    counted: node.inventoryQuantity ?? 0,
    onHand: node.quantity,
    difference: node.inventoryDiffQuantity ?? 0,
  }));
};

export const QuantRows = ({ rows, text }: { rows: CountQuantView[]; text: CountRowsText }) => {
  const { t } = useTranslate();
  const styles = readStockStyles();

  return (
    <div>
      {rows.map((row) => (
        <div key={row.id} style={styles.row}>
          <span>{row.productName}</span>
          <span>{row.locationName}</span>
          <span>{t(text.counted, { counted: row.counted })}</span>
          <span>{t(text.onHand, { onHand: row.onHand })}</span>
          <span>{t(text.difference, { difference: row.difference })}</span>
        </div>
      ))}
    </div>
  );
};

const localDateTime = () => toLocalDateTime(new Date().toISOString());

// The adjustment reference pop-up: a name for the moves and the date they get.
const AdjustmentNameForm = ({
  text,
  busy,
  error,
  onApply,
}: {
  text: ApplyCountsText;
  busy: boolean;
  error: string | null;
  onApply: (inventoryName: string, accountingDate: string | null) => void;
}) => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const [name, setName] = useState(DEFAULT_ADJUSTMENT_NAME);
  const [date, setDate] = useState(localDateTime);

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t(text.adjustmentTitle)}</div>
      <Input value={name} placeholder={t(text.adjustmentReason)} onValueChange={setName} />
      <Input type="datetime-local" value={date} onValueChange={setDate} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => onApply(name, toIsoDateTime(date))}>
          {t(text.apply)}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t(text.discard)}
        </Button>
      </div>
    </div>
  );
};

const ConflictChoice = ({
  text,
  rows,
  busy,
  error,
  onAnswer,
}: {
  text: ApplyCountsText;
  rows: CountQuantView[];
  busy: boolean;
  error: string | null;
  onAnswer: (answer: ConflictAnswer) => void;
}) => {
  const { t } = useTranslate();
  const styles = readStockStyles();

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t(text.conflictTitle)}</div>
      <div>{t(text.conflictBody)}</div>
      <QuantRows rows={rows} text={text.rows} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => onAnswer('keepCounted')}>
          {t(text.keepCounted)}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAnswer('keepDifference')}>
          {t(text.keepDifference)}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t(text.discard)}
        </Button>
      </div>
    </div>
  );
};

type ApplyRequest = { inventoryName: string | null; accountingDate: string | null };

// Apply on one row (no name asked) and Apply counts on the ticked rows (the
// reference pop-up first). Both go through the conflict pop-up when a count is outdated.
export const makeApplyCountsPopUp = ({ askName, text }: { askName: boolean; text: ApplyCountsText }) => {
  const ApplyCountsPopUp = () => {
    const { t } = useTranslate();
    const selectedIds = useSelectedRecordIds();
    const { busy, error, call } = usePopUpCall(t(text.failed));
    const [request, setRequest] = useState<ApplyRequest | null>(null);
    const [conflict, setConflict] = useState<CountQuantView[] | null>(null);
    const selectAll = selectedIds.length === 0;

    // The request is kept only once the route answered, so a refusal leaves the name form on screen with its error.
    const apply = async (next: ApplyRequest, conflictAnswer: ConflictAnswer | null) => {
      const result = await call<CountRouteResult>(APPLY_INVENTORY_ROUTE_PATH, {
        quantIds: selectedIds,
        onlySet: askName,
        inventoryName: next.inventoryName,
        date: next.accountingDate,
        conflictAnswer,
      });

      if (result === null) {
        return;
      }
      setRequest(next);
      if (result.kind === 'needsAnswer') {
        setConflict(result.quants);
        return;
      }
      await finishWith(t(text.applied));
    };

    useRunOnce(() => {
      if (!askName && !selectAll) {
        void apply({ inventoryName: null, accountingDate: null }, null);
      }
    });

    if (selectAll) {
      return <ClosablePanel message={null} error={t(text.selectAll)} busy={false} closeLabel={t(text.close)} />;
    }
    if (conflict !== null && request !== null) {
      return (
        <ConflictChoice
          text={text}
          rows={conflict}
          busy={busy}
          error={error}
          onAnswer={(answer) => void apply(request, answer)}
        />
      );
    }
    if (askName && request === null) {
      return (
        <AdjustmentNameForm
          text={text}
          busy={busy}
          error={error}
          onApply={(inventoryName, accountingDate) => void apply({ inventoryName, accountingDate }, null)}
        />
      );
    }

    return <ClosablePanel message={busy ? t(text.working) : null} error={error} busy={busy} closeLabel={t(text.close)} />;
  };

  return ApplyCountsPopUp;
};
