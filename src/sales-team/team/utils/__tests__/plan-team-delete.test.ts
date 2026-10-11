import { describe, expect, it } from 'vitest';

import { planTeamDelete } from 'src/sales-team/team/utils/plan-team-delete.util';

describe('planTeamDelete', () => {
  it('refuses to delete the two default teams that stay archived', () => {
    expect(
      planTeamDelete({
        deleted: [
          { id: 'web', seedKey: 'sales_team.salesteam_website_sales' },
          { id: 'pos', seedKey: 'sales_team.pos_sales_team' },
        ],
        linkedTeamIds: new Set(),
      }),
    ).toEqual({
      restore: [
        { id: 'web', reason: 'DEFAULT_TEAM' },
        { id: 'pos', reason: 'DEFAULT_TEAM' },
      ],
      proceed: [],
    });
  });

  it('lets the Sales team go', () => {
    expect(planTeamDelete({ deleted: [{ id: 'sales', seedKey: 'sales_team.team_sales_department' }], linkedTeamIds: new Set() })).toEqual({
      restore: [],
      proceed: ['sales'],
    });
  });

  it('refuses a team a stage is limited to', () => {
    expect(
      planTeamDelete({
        deleted: [
          { id: 'T', seedKey: null },
          { id: 'U', seedKey: null },
        ],
        linkedTeamIds: new Set(['T']),
      }),
    ).toEqual({ restore: [{ id: 'T', reason: 'USED_BY_STAGE' }], proceed: ['U'] });
  });
});
