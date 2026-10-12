import { describe, expect, it } from 'vitest';

import { NoPersonBehindRequestError } from 'src/roles/no-person-behind-request.error';
import { makeRolesRouteHandler, RolesUserError } from 'src/roles/page/roles-route';
import { RoleSyncBusyError } from 'src/roles/sync/sync-mixed-roles';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';

const handler = makeRolesRouteHandler(async () => 'en');
const answer = async (run: () => Promise<Record<string, unknown>>) => {
  const response = await handler(async () => run())({ body: {} } as never);

  return { status: response.status, body: JSON.parse(String(response.body)) as Record<string, unknown> };
};

describe('rolesRouteHandler', () => {
  it('answers 409 when another sync holds the claim', async () => {
    expect(await answer(async () => { throw new RoleSyncBusyError(); })).toEqual({
      status: 409,
      body: { error: 'Another role change is running. Try again in a moment.' },
    });
  });

  it("answers with a refusal's status and text", async () => {
    expect(await answer(async () => { throw new RolesUserError(403, 'Only an admin can change roles.'); })).toEqual({
      status: 403,
      body: { error: 'Only an admin can change roles.' },
    });
  });

  it('answers 403, not 500, when nobody is signed in behind the request', async () => {
    expect(await answer(async () => { throw new NoPersonBehindRequestError(); })).toEqual({
      status: 403,
      body: { error: 'Only an admin can change roles.' },
    });
  });

  it('answers 409 with the plain sentence when Twenty refuses the clicking user', async () => {
    const { status, body } = await answer(async () => { throw new GraphqlForbiddenError('denied'); });

    expect(status).toBe(409);
    expect(body.error).toBe('Your role does not allow this.');
  });

  it('answers 500 with the text of an outage or any other unexpected error', async () => {
    expect(await answer(async () => { throw new Error('List roles: connection refused'); })).toEqual({
      status: 500,
      body: { error: 'List roles: connection refused' },
    });
  });
});
