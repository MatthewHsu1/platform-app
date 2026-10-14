import { describe, expect, it } from 'vitest';

import { chooseTeam } from 'src/fieldservice/utils/choose-team.util';

describe('chooseTeam', () => {
  it('takes the location team, else the lowest sequence team, else throws', () => {
    expect(chooseTeam('t2', [{ id: 't1' }, { id: 't2' }])).toBe('t2');
    expect(chooseTeam(null, [{ id: 't2' }, { id: 't1' }])).toBe('t2');
    expect(() => chooseTeam(null, [])).toThrow('no service team');
  });
});
