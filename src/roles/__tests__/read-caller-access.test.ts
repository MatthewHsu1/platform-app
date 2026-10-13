import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoPersonBehindRequestError } from 'src/roles/no-person-behind-request.error';

const twentyMetadata = vi.fn();

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({ ...(await importOriginal<object>()), twentyMetadata }));
vi.mock('src/shared/utils/has-person-token.util', () => ({ hasPersonToken: () => true }));
vi.mock('twenty-sdk/logic-function', () => ({ kv: { get: vi.fn(async () => ({ version: 1, roles: {} })) } }));

const { readCallerAccess } = await import('src/roles/read-caller-access');

describe('readCallerAccess', () => {
  beforeEach(() => twentyMetadata.mockReset());

  it('throws a no-person error when Twenty says the caller is an API key or an app with nobody behind it', async () => {
    twentyMetadata.mockResolvedValueOnce({
      caller: 'person',
      errors: [{ message: 'This endpoint is not available to this caller', extensions: { code: 'FORBIDDEN' } }],
    });

    await expect(readCallerAccess()).rejects.toBeInstanceOf(NoPersonBehindRequestError);
  });

  it('lets any other failure through with its text', async () => {
    twentyMetadata.mockResolvedValueOnce({ caller: 'person', errors: [{ message: 'database is down', extensions: { code: 'INTERNAL_SERVER_ERROR' } }] });

    await expect(readCallerAccess()).rejects.toThrow('Read the signed-in user: database is down');
  });

  it('reads an Admin as Admin, whatever the permission flags say', async () => {
    twentyMetadata
      .mockResolvedValueOnce({ data: { currentUser: { currentUserWorkspace: { permissionFlags: [] }, workspaceMember: { id: 'm-1' } } } })
      .mockResolvedValueOnce({
        data: { currentWorkspace: { id: 'ws' }, getRoles: [{ id: 'r', universalIdentifier: '20202020-02c2-43f2-b94d-cab1f2b532eb', workspaceMembers: [{ id: 'm-1' }] }] },
      });

    expect(await readCallerAccess()).toMatchObject({ workspaceMemberId: 'm-1', isWorkspaceAdmin: true, canManageRoles: false });
  });
});
