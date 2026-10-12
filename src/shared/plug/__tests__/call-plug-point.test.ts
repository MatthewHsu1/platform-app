import { afterEach, describe, expect, it, vi } from 'vitest';

import { callPlugPoint } from 'src/shared/plug/call-plug-point';
import { PlugAnswerError } from 'src/shared/plug/plug-answer-error';
import { type PlugCallResult } from 'src/shared/plug/types/plug-call-result.type';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';
import { describePlugFailure } from 'src/shared/plug/utils/describe-plug-failure.util';

const ENV = { TWENTY_API_URL: 'http://server:3000', TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app-token' };
const NOW = new Date('2026-10-09T12:00:00.000Z');

const config = (values: Partial<PlugPointConfig> = {}): PlugPointConfig => ({
  enabled: true,
  target: { kind: 'route', path: '/acme/assign' },
  timeoutSeconds: 30,
  onError: 'DEFAULT',
  ...values,
});

// Answers with the request's own envelope around `payload`, unless told otherwise.
const answering = (payload: unknown, { status = 200, body }: { status?: number; body?: string } = {}) =>
  vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { plugPoint: string; requestId: string };

    return new Response(body ?? JSON.stringify({ plugPoint: request.plugPoint, requestId: request.requestId, payload }), { status });
  });

// A failure as the English text a reader sees.
const asText = (result: PlugCallResult<unknown>) =>
  result.kind === 'error' ? { kind: 'error', reason: describePlugFailure(result.failure) } : result;

const call = async (fetchImpl: typeof fetch, values: Partial<PlugPointConfig> = {}, validate = (answer: unknown) => answer) =>
  asText(
    await callPlugPoint('crm.assignment.v1', { leads: ['l1'] }, validate, {
      fetchImpl,
      now: () => NOW,
      readConfig: async () => config(values),
      env: ENV,
    }),
  );

afterEach(() => {
  vi.useRealTimers();
});

describe('callPlugPoint', () => {
  it('posts the envelope and returns the checked answer', async () => {
    const fetchImpl = answering({ assignments: [] });
    const result = await call(fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ kind: 'answer', payload: { assignments: [] } });
    const [url, init] = fetchImpl.mock.calls[0];
    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;

    expect(url).toBe('http://server:3000/s/acme/assign');
    expect(init?.redirect).toBe('error');
    expect(sent).toMatchObject({ plugPoint: 'crm.assignment.v1', sentAt: '2026-10-09T12:00:00.000Z', payload: { leads: ['l1'] } });
    expect(sent.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('gives up when the target does not answer in time', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
        }),
    );
    const pending = call(fetchImpl as unknown as typeof fetch, { timeoutSeconds: 2 });

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await pending).toEqual({ kind: 'error', reason: 'The plug point did not answer within 2 s.' });
  });

  it('reports a failed status, a body that is not JSON and an answer to another request', async () => {
    expect(await call(answering({}, { status: 500 }) as unknown as typeof fetch)).toEqual({
      kind: 'error',
      reason: 'The plug point answered with HTTP 500.',
    });
    expect(await call(answering({}, { body: 'not json' }) as unknown as typeof fetch)).toEqual({
      kind: 'error',
      reason: 'The plug point answer is not JSON.',
    });
    expect(
      await call(
        answering({}, { body: JSON.stringify({ plugPoint: 'crm.assignment.v1', requestId: 'other', payload: {} }) }) as unknown as typeof fetch,
      ),
    ).toEqual({ kind: 'error', reason: 'The plug point answer does not match the request.' });
  });

  it('reports an answer the plug point refuses', async () => {
    const result = await call(answering({ assignments: 'all' }) as unknown as typeof fetch, {}, () => {
      throw new Error('assignments must be a list');
    });

    expect(result).toEqual({ kind: 'error', reason: 'The plug point answer is not valid: assignments must be a list' });
  });

  it("gives the plug point's own reason for refusing an answer", async () => {
    const result = await call(answering({ assignments: [] }) as unknown as typeof fetch, {}, () => {
      throw new PlugAnswerError('Lead {leadId} was not in the request.', { leadId: 'l9' });
    });

    expect(result).toEqual({ kind: 'error', reason: 'The plug point answer is not valid: Lead l9 was not in the request.' });
  });

  it('reports a target that cannot be reached', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    expect(await call(fetchImpl as unknown as typeof fetch)).toEqual({ kind: 'error', reason: 'The plug point could not be reached: fetch failed' });
  });

  it('calls nothing when the plug point is off or has no target', async () => {
    const fetchImpl = answering({});

    expect(await call(fetchImpl as unknown as typeof fetch, { enabled: false })).toEqual({ kind: 'error', reason: 'The plug point is not turned on.' });
    expect(await call(fetchImpl as unknown as typeof fetch, { target: null })).toEqual({ kind: 'error', reason: 'The plug point has no target.' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
