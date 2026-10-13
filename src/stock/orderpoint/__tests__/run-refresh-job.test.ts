import { RetryableLogicFunctionError } from 'twenty-sdk/logic-function';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addRefreshRefusalTask, refreshReplenishmentSuggestions } from 'src/stock/orderpoint/refresh-replenishment-suggestions';
import { runRefreshJob } from 'src/stock/orderpoint/run-refresh-job';

vi.mock('src/stock/orderpoint/refresh-replenishment-suggestions', () => ({
  refreshReplenishmentSuggestions: vi.fn(),
  addRefreshRefusalTask: vi.fn(async () => {}),
}));

const DEADLINE = 1_000;

describe('runRefreshJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('goes on with the locations and the language it was given', async () => {
    vi.mocked(refreshReplenishmentSuggestions).mockResolvedValueOnce({ kind: 'done', created: 2 });

    expect(await runRefreshJob({ locationIds: ['loc-1', 7, ''], locale: 'fr-FR' }, DEADLINE)).toEqual({ kind: 'done', created: 2 });
    expect(refreshReplenishmentSuggestions).toHaveBeenCalledWith({ deadlineAt: DEADLINE, locationIds: ['loc-1'], locale: 'fr-FR' });
  });

  it('asks the queue to run it again while another refresh holds the list', async () => {
    vi.mocked(refreshReplenishmentSuggestions).mockResolvedValueOnce({ kind: 'held', continuing: false });

    await expect(runRefreshJob({ locationIds: ['loc-1'] }, DEADLINE)).rejects.toBeInstanceOf(RetryableLogicFunctionError);
  });

  it('puts a refusal on the product as a task, since no one waits for the answer', async () => {
    const refused = { kind: 'refused' as const, error: { message: 'Loop: {rule}', values: { rule: 'R' } }, productId: 'super' };
    vi.mocked(refreshReplenishmentSuggestions).mockResolvedValueOnce(refused);

    expect(await runRefreshJob({ locationIds: ['loc-1'] }, DEADLINE)).toEqual(refused);
    expect(addRefreshRefusalTask).toHaveBeenCalledWith(refused);
  });

  it('asks for a rerun after a passing error and reports any other error as it is', async () => {
    vi.mocked(refreshReplenishmentSuggestions).mockRejectedValueOnce(new Error('Rate limit exceeded'));
    await expect(runRefreshJob({}, DEADLINE)).rejects.toBeInstanceOf(RetryableLogicFunctionError);

    const broken = new Error('Cannot read the locations');
    vi.mocked(refreshReplenishmentSuggestions).mockRejectedValueOnce(broken);
    await expect(runRefreshJob({}, DEADLINE)).rejects.toBe(broken);
  });
});
