import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  Trans,
  unmountFrontComponent,
  useSelectedRecordIds,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { describeRouteError } from 'src/shared/describe-route-error';
import { type ReturnAction } from 'src/stock/picking/types/return-action.type';
import { type ReturnResult } from 'src/stock/picking/types/return-result.type';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  RETURN_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  RETURN_PICKING_ROUTE_PATH,
  RETURN_ROWS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

type ReturnRowAnswer = { moveId: string; productName: string; uomName: string; quantity: number };
type ReturnRowsAnswer = { rows: ReturnRowAnswer[]; canExchange: boolean };
// The typed text is kept as typed, so "0." or "1," can still be completed.
type ReturnRowView = ReturnRowAnswer & { text: string };
// Translated when shown; `detail` is the route's own message, already translated.
type Problem =
  | { kind: 'selectAll' }
  | { kind: 'loadFailed'; detail: string }
  | { kind: 'saveFailed'; detail: string };

const parseQuantity = (text: string) => {
  const quantity = Number(text.trim().replace(',', '.'));
  return text.trim().length > 0 && Number.isFinite(quantity) ? quantity : 0;
};

const ReturnPicking = () => {
  const { t } = useTranslate();
  const pickingIds = useSelectedRecordIds();
  const selectionKey = pickingIds.join(',');
  const [rows, setRows] = useState<ReturnRowView[] | null>(null);
  const [canExchange, setCanExchange] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    void unmountFrontComponent();
    void closeSidePanel();
  };

  useEffect(() => {
    const load = async () => {
      // "Select all" hands the button no ids.
      if (selectionKey.length === 0) {
        setRows([]);
        setProblem({ kind: 'selectAll' });
        return;
      }
      try {
        const answer = await postAppRoute<ReturnRowsAnswer>(RETURN_ROWS_ROUTE_PATH, { pickingIds: selectionKey.split(',') });

        setRows(answer.rows.map((row) => ({ ...row, text: String(row.quantity) })));
        setCanExchange(answer.canExchange);
      } catch (caught) {
        setRows([]);
        setProblem({ kind: 'loadFailed', detail: describeRouteError(caught, '') });
      }
    };

    void load();
  }, [selectionKey]);

  const setText = (moveId: string, text: string) =>
    setRows((current) => (current ?? []).map((row) => (row.moveId === moveId ? { ...row, text } : row)));

  const submit = async (action: ReturnAction) => {
    setIsSaving(true);
    setProblem(null);
    try {
      const answer = await postAppRoute<ReturnResult>(RETURN_PICKING_ROUTE_PATH, {
        pickingIds,
        action,
        rows: (rows ?? []).map((row) => ({ moveId: row.moveId, quantity: parseQuantity(row.text) })),
      });

      await enqueueSnackbar({ message: t('Return {name} created.', { name: answer.returnPickingName }), variant: 'success' });
      close();
    } catch (caught) {
      setProblem({ kind: 'saveFailed', detail: describeRouteError(caught, '') });
      setIsSaving(false);
    }
  };

  const describeProblem = (shown: Problem) => {
    if (shown.kind === 'selectAll') {
      return t('Select all is not supported here. Tick the records you want instead.');
    }
    if (shown.detail.length > 0) {
      return shown.detail;
    }

    return shown.kind === 'loadFailed' ? t('Could not load the products to return.') : t('Could not create the return.');
  };

  const styles = readStockStyles();
  const isBlocked = isSaving || rows === null || rows.length === 0;

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Reverse transfer</Trans>
      </div>
      {rows === null ? (
        <div>
          <Trans>Loading…</Trans>
        </div>
      ) : (
        rows.map((row) => (
          <div key={row.moveId} style={styles.row}>
            <span>{row.productName}</span>
            <Input value={row.text} onValueChange={(text: string) => setText(row.moveId, text)} />
            <span>{row.uomName}</span>
          </div>
        ))
      )}
      {problem === null ? null : <div style={styles.error}>{describeProblem(problem)}</div>}
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={isBlocked} onClick={() => void submit('return')}>
          {t('Return')}
        </Button>
        <Button size="sm" variant="outline" disabled={isBlocked} onClick={() => void submit('returnAll')}>
          {t('Return All')}
        </Button>
        {canExchange ? (
          <Button size="sm" variant="outline" disabled={isBlocked} onClick={() => void submit('exchange')}>
            {t('Return for Exchange')}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" disabled={isSaving} onClick={close}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: RETURN_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-return-picking',
  description: 'Asks how much of a done transfer to return, then makes the return.',
  component: ReturnPicking,
});
