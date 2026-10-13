import { describe, expect, it } from 'vitest';

import { linkRights, rightsToPermission } from 'src/roles/utils/role-rights.util';

describe('rightsToPermission', () => {
  it('maps read, update and delete to the four Twenty rights', () => {
    expect(rightsToPermission('obj', 'RUD')).toEqual({
      objectUniversalIdentifier: 'obj',
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: true,
      canDestroyObjectRecords: true,
    });
    expect(rightsToPermission('obj', 'RU')).toMatchObject({
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    });
    expect(rightsToPermission('obj', 'R')).toMatchObject({ canReadObjectRecords: true, canUpdateObjectRecords: false });
    expect(rightsToPermission('obj', '-')).toMatchObject({
      canReadObjectRecords: false,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    });
  });
});

describe('linkRights', () => {
  it('lets whoever may edit the owning field add and remove link rows', () => {
    expect(linkRights('RU')).toBe('RUD');
    expect(linkRights('RUD')).toBe('RUD');
    expect(linkRights('R')).toBe('R');
    expect(linkRights('-')).toBe('-');
  });
});
