import { type RoutePayload } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { makeApplyLeadUpdate, makeFindLead, makeLeadRouteErrors, makeLeadRouteHandler } from 'src/crm/lead/actions/lead-action-route';
import { makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { makeWriteLeadAsCaller } from 'src/crm/lead/write-leads-as-application';
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

describe('writing the update of a one-lead button', () => {
  const NOW = '2026-10-09T12:00:00.000Z';
  const STAGES: StageRow[] = [
    { id: 'new', name: 'New', sequence: 1, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
    { id: 'won', name: 'Won', sequence: 50, isWon: true, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
  ];
  const pendingLead = () =>
    readLeadRow({ id: 'l1', createdAt: '2026-09-01T09:00:00.000Z', leadType: 'OPPORTUNITY', wonStatus: 'PENDING', stageId: 'new', probability: 40, dateLastStageUpdate: NOW });
  const WON = { kind: 'update' as const, data: { stageId: 'won', probability: 100 } };
  const notFound = { notFound: 'Lead not found.' };

  // The caller's token as Twenty treats it: the write lands in the store unless the role refuses it.
  const setup = ({ member, refused = false }: { member: boolean; refused?: boolean }) => {
    const store = makeFakeLeadStore({ leads: [pendingLead()], stages: STAGES, now: NOW });
    const asCaller: { leadId: string; data: Record<string, unknown> }[] = [];
    const updateAsUser = async (leadId: string, data: Record<string, unknown>) => {
      if (refused) {
        requireData(refusedForRole, 'Update the lead');
      }
      asCaller.push({ leadId, data });
      await store.writeApi.updateLeads([leadId], data);
    };
    const applyLeadUpdate = makeApplyLeadUpdate({
      hasMemberBehind: async () => member,
      updateAsUser,
      writeAsCaller: makeWriteLeadAsCaller(store.writeApi),
    });

    return { store, asCaller, applyLeadUpdate };
  };

  it('closes a lead marked won through an API key on the day it is won, written with the caller\'s token', async () => {
    const { store, asCaller, applyLeadUpdate } = setup({ member: false });

    const response = await applyLeadUpdate('l1', WON, notFound);

    expect(response.status).toBe(200);
    expect(asCaller).toHaveLength(1);
    expect(asCaller[0].data).toMatchObject({ stageId: 'won', probability: 100, wonStatus: 'WON', dateClosed: NOW });
    expect(store.rows.get('l1')).toMatchObject({ stageId: 'won', probability: 100, wonStatus: 'WON', dateClosed: NOW });
    expect(store.moves.map((entry) => entry.moves)).toEqual([{ won: 1, lost: 0 }]);
  });

  it('answers as before and writes nothing when the role behind an API key may not update the lead', async () => {
    const { store, applyLeadUpdate } = setup({ member: false, refused: true });

    const response = await withErrors(() => applyLeadUpdate('l1', WON, notFound))(payload);

    expect(response.status).toBe(409);
    expect(store.writes).toEqual([]);
    expect(store.moves).toEqual([]);
  });

  it("sends a member's write as it is, for the lead trigger to apply the save rules", async () => {
    const { asCaller, applyLeadUpdate } = setup({ member: true });

    await applyLeadUpdate('l1', WON, notFound);

    expect(asCaller).toEqual([{ leadId: 'l1', data: { stageId: 'won', probability: 100 } }]);
  });
});
