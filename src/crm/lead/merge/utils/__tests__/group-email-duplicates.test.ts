import { describe, expect, it } from 'vitest';

import { groupEmailDuplicates } from 'src/crm/lead/merge/utils/group-email-duplicates.util';

const withEmail = (id: string, primaryEmail: string | null) => ({ id, emailFrom: { primaryEmail, additionalEmails: null } });

describe('groupEmailDuplicates', () => {
  it('gives each lead the found leads with one of its addresses, itself included', () => {
    const leads = [withEmail('a', 'Ann <ann@gym.test>'), withEmail('b', 'bob@gym.test'), withEmail('c', null)];
    const found = [withEmail('a', 'ann@gym.test'), withEmail('old', 'ann@gym.test'), withEmail('b', 'bob@gym.test')];

    const groups = groupEmailDuplicates(leads, found);

    expect(groups.get('a')).toEqual(['a', 'old']);
    expect(groups.get('b')).toEqual(['b']);
    expect(groups.get('c')).toEqual([]);
  });
});
