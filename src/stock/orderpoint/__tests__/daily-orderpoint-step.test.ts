import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dailyOrderpointStep } from 'src/stock/orderpoint/daily-orderpoint-step';
import {
  releaseOrderpointClaims,
  releaseOrderpointClaimsUnlessWritten,
  takeOrderpointClaims,
} from 'src/stock/orderpoint/orderpoint-claims';
import { procureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';

vi.mock('src/shared/claims/claim', () => ({
  claimKey: (action: string, recordId: string) => `${action}:${recordId}`,
  withClaim: async (_key: string, run: (runId: string) => Promise<unknown>) => ({ kind: 'done', result: await run('daily-run') }),
}));
vi.mock('src/stock/orderpoint/destroy-processed-suggestions', () => ({ destroyProcessedSuggestions: vi.fn(async () => []) }));
vi.mock('src/stock/orderpoint/orderpoint-records', () => ({
  stockWarehouseOrderpoints: {
    find: vi.fn(async () => [
      { id: 'op-auto-1', productId: 'desk', trigger: 'AUTO' },
      { id: 'op-manual', productId: 'desk', trigger: 'MANUAL' },
      { id: 'op-auto-2', productId: 'chair', trigger: 'AUTO' },
    ]),
  },
}));
vi.mock('src/stock/stock-records', () => ({ productProducts: { find: vi.fn(async () => []) } }));
vi.mock('src/stock/orderpoint/orderpoint-claims', () => ({
  takeOrderpointClaims: vi.fn(),
  releaseOrderpointClaims: vi.fn(),
  releaseOrderpointClaimsUnlessWritten: vi.fn(async () => {}),
}));
vi.mock('src/stock/orderpoint/recompute-orderpoint', () => ({ recomputeOrderpoint: vi.fn(async () => ({ failures: [] })) }));
vi.mock('src/stock/orderpoint/replenishment-issue-tasks', () => ({ addReplenishmentIssueTasks: vi.fn(async () => {}) }));
vi.mock('src/stock/orderpoint/procure-orderpoints', () => ({
  procureOrderpoints: vi.fn(async () => ({ kind: 'done', moveIds: [], failures: [], unprocessedIds: [] })),
}));
vi.mock('src/stock/orderpoint/refresh-replenishment-suggestions', () => ({
  addRefreshRefusalTask: vi.fn(),
  refreshReplenishmentSuggestions: vi.fn(),
}));

describe('dailyOrderpointStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('frees every automatic rule this run may hold when taking the claims fails partway, and reports the failure', async () => {
    vi.mocked(takeOrderpointClaims).mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(dailyOrderpointStep()).rejects.toThrow('Rate limit exceeded');

    expect(vi.mocked(releaseOrderpointClaimsUnlessWritten).mock.calls).toEqual([[['op-auto-1', 'op-auto-2'], 'daily-run']]);
    expect(procureOrderpoints).not.toHaveBeenCalled();
  });

  it('counts the run as done when the order is placed but freeing the rules fails', async () => {
    vi.mocked(takeOrderpointClaims).mockResolvedValueOnce({ taken: ['op-auto-1', 'op-auto-2'], busy: [] });
    vi.mocked(releaseOrderpointClaims).mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(dailyOrderpointStep()).resolves.toBeUndefined();

    expect(vi.mocked(procureOrderpoints).mock.calls[0][0]).toEqual(['op-auto-1', 'op-auto-2']);
    expect(releaseOrderpointClaimsUnlessWritten).not.toHaveBeenCalled();
  });
});
