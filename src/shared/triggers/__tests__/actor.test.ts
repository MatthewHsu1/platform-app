import { describe, expect, it } from 'vitest';

import { isStaffChange } from 'src/shared/triggers/actor';

const SAVED_BY_APP = { updatedBy: { source: 'APPLICATION' } };
const SAVED_BY_STAFF = { updatedBy: { source: 'MANUAL' } };

describe('isStaffChange', () => {
  it('a signed-in user deleting a row the app saved last is a staff delete', () => {
    expect(isStaffChange('deleted', { userId: 'u1', workspaceMemberId: 'm1' }, SAVED_BY_APP)).toBe(true);
  });

  it("the app's own delete of a row staff saved last is not a staff delete", () => {
    expect(isStaffChange('deleted', {}, SAVED_BY_STAFF)).toBe(false);
  });

  it('a restore is judged by the event, like a delete', () => {
    expect(isStaffChange('restored', { workspaceMemberId: 'm1' }, SAVED_BY_APP)).toBe(true);
    expect(isStaffChange('restored', {}, SAVED_BY_STAFF)).toBe(false);
  });

  it('an update is judged by its saver', () => {
    expect(isStaffChange('updated', { userId: 'u1' }, SAVED_BY_APP)).toBe(false);
    expect(isStaffChange('created', {}, SAVED_BY_STAFF)).toBe(true);
  });
});
