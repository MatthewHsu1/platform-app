import { PlugAnswerError } from 'src/shared/plug/plug-answer-error';
import { PLUG_FAILURE_MESSAGES } from 'src/shared/plug/plug-failure-messages.constant';
import { readPlugConfig } from 'src/shared/plug/read-plug-config';
import { type PlugCallResult } from 'src/shared/plug/types/plug-call-result.type';
import { type PlugEnvelope } from 'src/shared/plug/types/plug-envelope.type';
import { type PlugFailure } from 'src/shared/plug/types/plug-failure.type';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';
import { buildPlugRequest } from 'src/shared/plug/utils/build-plug-request.util';

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const failed = (message: string, values: PlugFailure['values'] = {}, cause?: PlugFailure) => ({
  kind: 'error' as const,
  failure: { message, values, ...(cause === undefined ? {} : { cause }) },
});

const isEnvelope = (value: unknown): value is PlugEnvelope<unknown> =>
  typeof value === 'object' && value !== null && 'plugPoint' in value && 'requestId' in value && 'payload' in value;

// Asks the configured target to decide. Every failure comes back as a reason
// the caller reports, never as a throw: the caller then runs its own rules or
// skips, as the settings say.
export const callPlugPoint = async <TRequest, TAnswer>(
  name: string,
  payload: TRequest,
  validate: (answer: unknown, request: TRequest) => TAnswer,
  {
    fetchImpl = fetch,
    now = () => new Date(),
    readConfig = readPlugConfig,
    env = process.env,
  }: {
    fetchImpl?: typeof fetch;
    now?: () => Date;
    readConfig?: (name: string) => Promise<PlugPointConfig | null>;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<PlugCallResult<TAnswer>> => {
  const config = await readConfig(name);

  if (config === null || !config.enabled) {
    return failed(PLUG_FAILURE_MESSAGES.notTurnedOn);
  }
  if (config.target === null) {
    return failed(PLUG_FAILURE_MESSAGES.noTarget);
  }
  const request = buildPlugRequest({ name, target: config.target, env });

  if (request.kind === 'error') {
    return request;
  }
  const envelope: PlugEnvelope<TRequest> = { plugPoint: name, requestId: crypto.randomUUID(), sentAt: now().toISOString(), payload };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutSeconds * 1_000);
  let status: number;
  let text: string;

  try {
    const response = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(envelope),
      signal: controller.signal,
      // A redirect could carry the app token and the request somewhere else.
      redirect: 'error',
    });

    status = response.status;
    text = await response.text();
  } catch (error) {
    return controller.signal.aborted
      ? failed(PLUG_FAILURE_MESSAGES.timedOut, { seconds: config.timeoutSeconds })
      : failed(PLUG_FAILURE_MESSAGES.unreachable, { detail: reasonOf(error) });
  } finally {
    clearTimeout(timer);
  }
  if (status !== 200) {
    return failed(PLUG_FAILURE_MESSAGES.badStatus, { status });
  }
  let answer: unknown;

  try {
    answer = JSON.parse(text);
  } catch {
    return failed(PLUG_FAILURE_MESSAGES.notJson);
  }
  if (!isEnvelope(answer) || answer.plugPoint !== name || answer.requestId !== envelope.requestId) {
    return failed(PLUG_FAILURE_MESSAGES.mismatch);
  }
  try {
    return { kind: 'answer', payload: validate(answer.payload, payload) };
  } catch (error) {
    return error instanceof PlugAnswerError
      ? failed(PLUG_FAILURE_MESSAGES.invalid, {}, { message: error.source, values: error.values })
      : failed(PLUG_FAILURE_MESSAGES.invalid, { reason: reasonOf(error) });
  }
};
