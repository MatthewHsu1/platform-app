import { type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

export const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const readBody = (payload: RoutePayload) =>
  (payload.body ?? {}) as Record<string, unknown>;
