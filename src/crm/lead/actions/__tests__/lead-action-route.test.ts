import { type RoutePayload } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { makeFindLead, makeLeadRouteErrors, makeLeadRouteHandler } from 'src/crm/lead/actions/lead-action-route';
import { jsonResponse } from 'src/shared/route-response';
import { type GraphqlResponse, requireData } from 'src/shared/twenty-graphql';

const payload = {} as RoutePayload;
const withErrors = makeLeadRouteErrors(async () => 'en');
const leadRoute = makeLeadRouteHandler(async () => 'en');

// The answer Twenty gives the clicking user's token when their role lacks the right.
const refusedForRole: GraphqlResponse<unknown> = {
  data: null,
  errors: [{ message: 'Permission denied on crmLead', extensions: { code: 'FORBIDDEN', subCode: 'PERMISSION_DENIED' } }],
  caller: 'person',
};

describe('lead route errors', () => {
  it("answers 409 with a plain sentence and Twenty's text as detail when the user's role refuses", async () => {
    const response = await withErrors(async () => {
      requireData(refusedForRole, 'Update the lead');
      return jsonResponse(200, {});
    })(payload);

    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'Your role does not allow this.',
      detail: 'Update the lead: Permission denied on crmLead',
    });
  });

  it('answers 500 with the message of any other failure', async () => {
    const response = await withErrors(async () => {
      throw new Error('Read the lead: connection reset');
    })(payload);

    expect(response.status).toBe(500);
    expect(JSON.parse(String(response.body))).toEqual({ error: 'Read the lead: connection reset' });
  });

  it('passes the answer of the route through', async () => {
    const response = await withErrors(async () => jsonResponse(404, { error: 'Lead not found.' }))(payload);

    expect(response.status).toBe(404);
  });
});

describe('lead route handler', () => {
  it('answers a refusal with its status and its text, the values filled in', async () => {
    const refused = await leadRoute(async () => {
      throw new LeadActionError('Only pending leads can be marked lost: {names}.', { names: 'Gym B' });
    })(payload);
    const missing = await leadRoute(async () => {
      throw new LeadActionError('{count} of the selected leads were not found.', { count: 2 }, 404);
    })(payload);

    expect(refused.status).toBe(409);
    expect(JSON.parse(String(refused.body))).toEqual({ error: 'Only pending leads can be marked lost: Gym B.' });
    expect(missing.status).toBe(404);
    expect(JSON.parse(String(missing.body))).toEqual({ error: '2 of the selected leads were not found.' });
  });

  it("answers 409 with a plain sentence and Twenty's text as detail when the user's role refuses", async () => {
    const response = await leadRoute(async () => {
      requireData(refusedForRole, 'Update leads');
      return {};
    })(payload);

    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'Your role does not allow this.',
      detail: 'Update leads: Permission denied on crmLead',
    });
  });
});

describe('reading the lead a button works on', () => {
  it('reads a lead that is gone or hidden from the user as not found, not as an error', async () => {
    const findLead = makeFindLead(async () => ({ data: { crmLeads: { edges: [] } }, caller: 'person' }));

    expect(await findLead('missing', 'id')).toBeNull();
  });

  it('reads the lead when the user can see it', async () => {
    const findLead = makeFindLead(async () => ({ data: { crmLeads: { edges: [{ node: { id: 'L' } }] } }, caller: 'person' }));

    expect(await findLead('L', 'id')).toEqual({ id: 'L' });
  });
});
