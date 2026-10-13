import { useState } from 'react';
import { closeSidePanel, enqueueSnackbar, unmountFrontComponent, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { DISCARD_EXPIRED_LINES_ROUTE_PATH } from 'src/product-expiry/actions/product-expiry-actions-universal-identifiers.constant';
import { readExpiryQuestion } from 'src/product-expiry/actions/read-expiry-question';
import { describeRouteError } from 'src/shared/describe-route-error';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { LinkList } from 'src/shared/front-components/link-list';
import { useRunOnce } from 'src/shared/front-components/pop-up';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { printViewUrl } from 'src/stock/printing/print-view-url';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { ReceptionReport } from 'src/stock/reports/reception/reception-widget.front-component';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readStockStyles } from 'src/stock/stock-theme';
import { type ValidateRouteBody } from 'src/stock/picking/types/validate-route-body.type';
import { type ValidateRouteResult } from 'src/stock/picking/types/validate-route-result.type';
import { type ValidateText } from 'src/stock/picking/types/validate-text.type';

type Answer = Omit<ValidateRouteBody, 'pickingIds'>;
type Screen =
  | { kind: 'running' }
  | { kind: 'backorder'; listed: boolean; rows: { id: string; name: string; createBackorder: boolean }[] }
  | ({ kind: 'expiredLots'; pickingIds: string[] } & Awaited<ReturnType<typeof readExpiryQuestion>>)
  | { kind: 'error'; message: string }
  | { kind: 'done'; links: PrintLink[]; receptionPickingIds: string[] };

// The Validate pop-ups. `body` names what is validated (transfers or a batch);
// each question's answer is posted with it again. Without `showTransfers` the
// backorder question answers for all at once, as for a batch; the route also
// asks so when the selected transfers are exactly one batch's.
export const ValidateFlow = ({
  routePath,
  body,
  showTransfers,
  text,
}: {
  routePath: string;
  body: Record<string, unknown> | null;
  showTransfers: boolean;
  text: ValidateText;
}) => {
  const { t } = useTranslate();
  const [screen, setScreen] = useState<Screen>({ kind: 'running' });
  const [answer, setAnswer] = useState<Answer>({});

  const close = () => {
    void unmountFrontComponent();
    void closeSidePanel();
  };

  const run = async (next: Answer) => {
    setScreen({ kind: 'running' });
    setAnswer(next);
    try {
      // Dates on the prints Validate makes show as the user's calendar shows them.
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await postAppRoute<ValidateRouteResult>(routePath, { ...body, ...next, timeZone });

      if (result.kind === 'done') {
        await enqueueSnackbar({
          message:
            result.backorderIds.length > 0
              ? t(text.validatedWithBackorders, { count: result.backorderIds.length })
              : t(text.validated),
          variant: 'success',
        });
        const receptionPickingIds = result.showReceptionReport ?? [];

        // The pop-up stays open for the prints to open and the reception report to allocate from.
        if (result.printouts.length === 0 && receptionPickingIds.length === 0) {
          close();
          return;
        }
        setScreen({ kind: 'done', links: result.printouts, receptionPickingIds });
        return;
      }
      if (result.question === 'backorder') {
        const nameById = new Map<string, string>();
        const listed = showTransfers && result.showTransfers !== false;

        if (listed) {
          const names = await queryAsUser<{ stockPickings: { edges: { node: { id: string; name: string | null } }[] } }>(
            `query BackorderPickings($ids: [UUID!]) { stockPickings(filter: { id: { in: $ids } }) { edges { node { id name } } } }`,
            { ids: result.pickingIds },
          );

          names.stockPickings.edges.forEach(({ node }) => nameById.set(node.id, textOrNull(node.name) ?? '/'));
        }
        setScreen({
          kind: 'backorder',
          listed,
          rows: result.pickingIds.map((id) => ({ id, name: nameById.get(id) ?? '/', createBackorder: true })),
        });
        return;
      }
      // Without the names the question still asks, in its general wording.
      const named = await readExpiryQuestion(result.pickingIds).catch(() => ({ question: null, lots: [] }));

      setScreen({ kind: 'expiredLots', pickingIds: result.pickingIds, ...named });
    } catch (error) {
      setScreen({ kind: 'error', message: describeRouteError(error, t(text.failed)) });
    }
  };

  // The answer given to the backorder question still holds once the expired lines are gone.
  const discardExpired = async (pickingIds: string[]) => {
    setScreen({ kind: 'running' });
    try {
      await postAppRoute(DISCARD_EXPIRED_LINES_ROUTE_PATH, { pickingIds });
    } catch (error) {
      setScreen({ kind: 'error', message: describeRouteError(error, t(text.discardFailed)) });
      return;
    }
    await run(answer);
  };

  useRunOnce(() => {
    if (body === null) {
      setScreen({ kind: 'error', message: t(text.emptySelection) });
      return;
    }
    void run({});
  });

  const styles = readStockStyles();

  if (screen.kind === 'running') {
    return <div style={styles.panel}>{t(text.validating)}</div>;
  }

  if (screen.kind === 'error') {
    return (
      <div style={styles.panel}>
        <div style={styles.error}>{screen.message}</div>
        <div style={styles.buttons}>
          <Button size="sm" variant="outline" onClick={close}>
            {t(text.close)}
          </Button>
        </div>
      </div>
    );
  }

  if (screen.kind === 'done') {
    const links = (
      <LinkList
        title={t(text.printoutsTitle)}
        links={screen.links.map((link) => {
          const name = text.printNames[link.report];

          return { name: name === undefined ? link.report : t(name), url: printViewUrl(link.pass) };
        })}
      />
    );

    if (screen.receptionPickingIds.length > 0) {
      return (
        <div>
          {screen.links.length > 0 ? <div style={styles.panel}>{links}</div> : null}
          <ReceptionReport pickingIds={screen.receptionPickingIds} />
        </div>
      );
    }
    return (
      <div style={styles.panel}>
        {links}
        <div style={styles.buttons}>
          <Button size="sm" variant="outline" onClick={close}>
            {t(text.close)}
          </Button>
        </div>
      </div>
    );
  }

  if (screen.kind === 'expiredLots') {
    const { question, lots, pickingIds } = screen;

    return (
      <div style={styles.panel}>
        <div style={styles.title}>{t(text.expiredTitle)}</div>
        <div>
          {question !== null && question.lotIds.length <= 1
            ? t(text.expiredOneLot, { productName: question.productName, lotName: question.lotName })
            : t(text.expiredLots)}
        </div>
        <div>{t(text.expiredProceed)}</div>
        {lots.length > 1
          ? lots.map((lot) => (
              <div key={lot.id} style={styles.row}>
                {lot.productName} {lot.lotName}
              </div>
            ))
          : null}
        <div style={styles.buttons}>
          <Button size="sm" variant="solid" color="accent" onClick={() => void run({ ...answer, skipExpired: true })}>
            {t(text.confirm)}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void discardExpired(pickingIds)}>
            {t(text.discardExpired)}
          </Button>
          <Button size="sm" variant="ghost" onClick={close}>
            {t(text.cancel)}
          </Button>
        </div>
      </div>
    );
  }

  const { rows, listed } = screen;
  const toggle = (id: string) =>
    setScreen({ kind: 'backorder', listed, rows: rows.map((row) => (row.id === id ? { ...row, createBackorder: !row.createBackorder } : row)) });

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t(text.backorderTitle)}</div>
      <div>{t(text.backorderExplanation)}</div>
      <div>{t(text.backorderHelp)}</div>
      {listed && rows.length > 1
        ? rows.map((row) => (
            <label key={row.id} style={styles.row}>
              <input type="checkbox" checked={row.createBackorder} onChange={() => toggle(row.id)} />
              {row.name}
            </label>
          ))
        : null}
      <div style={styles.buttons}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          onClick={() =>
            void run({
              ...answer,
              backorderAnswer: {
                createBackorderIds: rows.filter((row) => row.createBackorder).map((row) => row.id),
                noBackorderIds: rows.filter((row) => !row.createBackorder).map((row) => row.id),
              },
            })
          }
        >
          {t(text.createBackorder)}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void run({ ...answer, backorderAnswer: { createBackorderIds: [], noBackorderIds: rows.map((row) => row.id), noBackorderButton: true } })
          }
        >
          {t(text.noBackorder)}
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          {t(text.discard)}
        </Button>
      </div>
    </div>
  );
};
