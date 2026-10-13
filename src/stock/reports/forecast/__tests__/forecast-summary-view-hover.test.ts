import { createElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ForecastSummaryView } from 'src/stock/reports/forecast/forecast-summary-view';
import { type ForecastAnswer } from 'src/stock/reports/forecast/types/forecast-answer.type';
import { type ForecastSummaryText } from 'src/stock/reports/forecast/types/forecast-summary-text.type';

vi.mock('twenty-sdk/front-component', () => ({
  AppPath: { RecordShowPage: 'RecordShowPage' },
  navigate: () => undefined,
  useLocale: () => 'en-US',
  useTranslate: () => ({
    t: (text: string | { message: string }, values?: Record<string, unknown>) =>
      (typeof text === 'string' ? text : text.message).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? '')),
  }),
}));

// Every text is its own key, so the page shows plain strings, as a translated page does.
// The project has no types for react-dom, so the server renderer is loaded by a name the type checker does not follow.
const SERVER_RENDERER = 'react-dom/server';
const renderToStaticMarkup = async (element: ReactElement) =>
  ((await import(SERVER_RENDERER)) as { renderToStaticMarkup: (element: ReactElement) => string }).renderToStaticMarkup(element);

const TEXT = new Proxy({}, { get: (_, key) => ({ message: String(key) }) }) as ForecastSummaryText;

const ANSWER: ForecastAnswer = {
  warehouse: { id: 'wh', name: 'Choice' },
  headings: [{ objectNameSingular: 'productTemplate', recordId: 'tmpl', name: 'PW pad' }],
  products: [
    {
      id: 'prod',
      name: 'PW pad',
      uomName: 'Units',
      onHand: 2,
      free: 1,
      incoming: 0,
      outgoing: 1,
      forecast: 1,
      draftIn: 0,
      draftOut: 0,
      toRemove: null,
      leadDays: { totalDelay: 0, horizonTime: 365, descriptions: [] },
    },
  ],
  lines: [
    {
      productId: 'prod',
      quantity: 1,
      moveInId: null,
      moveOutId: 'move',
      documentIn: null,
      documentOut: { id: 'out', name: 'WH/OUT/00073' },
      receiptDate: null,
      deliveryDate: '2026-10-11',
      replenishmentFilled: true,
      isLate: false,
      deliveryLate: false,
      receiptLate: false,
      inTransit: false,
      isMatched: false,
      reservation: null,
      removalDate: null,
    },
  ],
  graph: [
    { date: '2026-10-10', forecast: 0, incoming: 0, outgoing: 0 },
    { date: '2026-10-11', forecast: 1, incoming: 0, outgoing: 0 },
  ],
  leadHorizonDate: null,
  today: '2026-10-11',
  digits: 2,
  useExpirationDate: false,
  truncated: false,
  canReserve: true,
};

// twenty-ui shows a plain-text label in a hover tooltip, marked data-testid="tooltip". That tooltip's hover
// listener reads the event it is given; the front component sandbox gives none, and the tab fails with
// "Cannot use 'in' operator to search for 'composedPath' in undefined".
describe('summary report in the front component sandbox', () => {
  it('has no hover tooltip: every text is plain markup', async () => {
    const page = await renderToStaticMarkup(
      createElement(ForecastSummaryView, { data: ANSWER, text: TEXT, busy: false, onReserve: () => undefined, onUnreserve: () => undefined }),
    );

    expect(page).toContain('reservationsTitle');
    expect(page).not.toContain('data-testid="tooltip"');
  });
});
