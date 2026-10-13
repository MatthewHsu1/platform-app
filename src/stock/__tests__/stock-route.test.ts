import { type RoutePayload } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { type GraphqlResponse, requireData } from 'src/shared/twenty-graphql';
import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { StockUserError } from 'src/stock/stock-errors';
import { makeStockRouteHandler, readIds } from 'src/stock/stock-route';

const payload = (body: Record<string, unknown>) => ({ body }) as unknown as RoutePayload;
const handler = makeStockRouteHandler(async () => 'en');

describe('stockRouteHandler', () => {
  it('answers 200 with the result of the run', async () => {
    const response = await handler(async (body) => ({ seen: readIds(body, 'pickingIds') }))(
      payload({ pickingIds: ['a', 'b', 'a', '', 3] }),
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(String(response.body))).toEqual({ seen: ['a', 'b'] });
  });

  it('answers 409 with the refusal text filled in', async () => {
    const response = await handler(async () => {
      throw new StockUserError('You cannot validate a transfer if no quantities are reserved for {name}.', { name: 'WH/OUT/00001' });
    })(payload({}));
    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'You cannot validate a transfer if no quantities are reserved for WH/OUT/00001.',
    });
  });

  it('answers 409 with the refusal and the record the flow made before it, so the pop-up can retry that record', async () => {
    const response = await handler(async () => {
      throw new StockUserError('This record is being processed. Try again in a moment.', {}, { scrapId: 'scrap-1' });
    })(payload({}));
    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'This record is being processed. Try again in a moment.',
      scrapId: 'scrap-1',
    });
  });

  it('answers 409 with every procurement that cannot be planned, one per line', async () => {
    const response = await handler(async () => {
      throw new ProcurementFailure([
        { message: 'No source location defined on stock rule: {rule}!', values: { rule: 'WH: Stock → Customers' } },
        {
          message: 'No rule has been found to replenish "{product}" in "{location}".\nVerify the routes configuration on the product.',
          values: { product: 'Desk Combination', location: 'WH/Stock' },
        },
      ]);
    })(payload({}));
    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error:
        'No source location defined on stock rule: WH: Stock → Customers!\nNo rule has been found to replenish "Desk Combination" in "WH/Stock".\nVerify the routes configuration on the product.',
    });
  });

  // Errors as Twenty's handlers build them: a role without the right, and a unique key clash, which
  // Twenty also answers with the FORBIDDEN code.
  const permissionDenied = {
    message: 'Entity performing the request does not have permission',
    extensions: { code: 'FORBIDDEN', subCode: 'PERMISSION_DENIED', userFriendlyMessage: 'User does not have permission.' },
  };
  const uniqueClash = {
    message: 'A record with this value already exists.',
    extensions: {
      code: 'FORBIDDEN',
      subCode: 'QUERY_VIOLATES_UNIQUE_CONSTRAINT',
      userFriendlyMessage: 'A record with this value already exists.',
    },
  };
  const answerTo = (response: GraphqlResponse<Record<string, unknown>>) =>
    handler(async () => requireData(response, 'Update stockWarehouseOrderpoint'))(payload({}));

  it("answers 409 with a plain sentence when Twenty refuses the user's own call for lack of rights, and keeps Twenty's text", async () => {
    const response = await answerTo({ data: null, errors: [permissionDenied], caller: 'person' });
    expect(response.status).toBe(409);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'Your role does not allow this.',
      detail: 'Update stockWarehouseOrderpoint: Entity performing the request does not have permission',
    });
  });

  it('answers 500 with the raw text when the app itself is refused: its role is missing a right', async () => {
    const response = await answerTo({ data: null, errors: [permissionDenied], caller: 'application' });
    expect(response.status).toBe(500);
    expect(JSON.parse(String(response.body))).toEqual({
      error: 'Update stockWarehouseOrderpoint: Entity performing the request does not have permission',
    });
  });

  it('answers 500 with the raw text for a FORBIDDEN answer that is not about rights', async () => {
    const response = await answerTo({ data: null, errors: [uniqueClash], caller: 'person' });
    expect(response.status).toBe(500);
    expect(JSON.parse(String(response.body))).toEqual({ error: 'Update stockWarehouseOrderpoint: A record with this value already exists.' });
  });

  it('answers 500 with the message of any other error', async () => {
    const response = await handler(async () => {
      throw new Error('Update stockQuants where: deadlock detected');
    })(payload({}));
    expect(response.status).toBe(500);
    expect(JSON.parse(String(response.body))).toEqual({ error: 'Update stockQuants where: deadlock detected' });
  });
});
