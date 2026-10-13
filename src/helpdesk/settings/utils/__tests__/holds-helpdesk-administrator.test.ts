import { describe, expect, it } from 'vitest';

import { holdsHelpdeskAdministrator } from 'src/helpdesk/settings/utils/holds-helpdesk-administrator.util';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';

describe('holdsHelpdeskAdministrator', () => {
  it('lets the workspace admin and the Work cases administrator change the settings, and nobody else', () => {
    expect(holdsHelpdeskAdministrator({ isWorkspaceAdmin: true, blockKeys: [] })).toBe(true);
    expect(holdsHelpdeskAdministrator({ isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.workCasesAdministrator] })).toBe(true);
    expect(holdsHelpdeskAdministrator({ isWorkspaceAdmin: false, blockKeys: [BLOCK_KEYS.workCasesAll, BLOCK_KEYS.salesAdministrator] })).toBe(false);
  });
});
