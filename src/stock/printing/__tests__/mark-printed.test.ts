import { beforeEach, describe, expect, it, vi } from 'vitest';

let canUpdate = true;
const updateMany = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock('src/shared/object-rights', () => ({ hasUpdateRights: async () => canUpdate }));
vi.mock('src/stock/stock-records', () => ({
  stockPickings: { find: async () => [{ id: 'ready-1' }, { id: 'ready-2' }], updateMany },
}));

const { markPrinted } = await import('src/stock/printing/mark-printed');

beforeEach(() => {
  updateMany.mockClear();
  canUpdate = true;
});

describe('markPrinted', () => {
  it('sets the printed flag on the ready transfers for a person who may update transfers', async () => {
    await markPrinted(['ready-1', 'ready-2']);

    expect(updateMany).toHaveBeenCalledWith(['ready-1', 'ready-2'], { printed: true });
  });

  it('leaves the flag unset for a person who may not update transfers', async () => {
    canUpdate = false;

    await markPrinted(['ready-1', 'ready-2']);

    expect(updateMany).not.toHaveBeenCalled();
  });
});
