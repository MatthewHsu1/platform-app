import { describe, expect, it } from 'vitest';

import { runDailyJob } from 'src/stock/scheduler/run-daily-job';

describe('runDailyJob', () => {
  it('runs the steps in their order, carries on after a failure and reports it', async () => {
    const ran: string[] = [];
    const step = (order: number, name: string, fail = false) => ({
      order,
      name,
      run: async () => {
        ran.push(name);
        if (fail) {
          throw new Error('Rate limit exceeded');
        }
      },
    });

    const result = await runDailyJob([
      step(5, 'resume stale claims'),
      step(2, 'reserve waiting moves', true),
      step(4, 'stock rows and ledger'),
    ]);

    expect(ran).toEqual(['reserve waiting moves', 'stock rows and ledger', 'resume stale claims']);
    expect(result).toEqual({
      ran: ['reserve waiting moves', 'stock rows and ledger', 'resume stale claims'],
      failures: ['reserve waiting moves: Rate limit exceeded'],
    });
  });
});
