import { describe, expect, it } from 'vitest';

import { CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS, CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { buildRowAccessConfig } from 'src/roles/utils/build-row-access-config.util';

const LEAD = CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER;

describe('buildRowAccessConfig', () => {
  it('names every object a module declares an owner field for, and each mixed role with its rules', () => {
    expect(
      buildRowAccessConfig({
        mixedRoles: [
          { roleId: 'b-role-all', rowRules: { [LEAD]: 'all' } },
          { roleId: 'a-role-own', rowRules: { [LEAD]: 'mineOrUnowned' } },
          { roleId: 'c-role-stock', rowRules: {} },
        ],
        modules: ROLE_MODULES,
      }),
    ).toEqual({
      version: 2,
      objects: [{ objectUniversalIdentifier: LEAD, ownerFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.salesperson }],
      roles: [
        { roleId: 'a-role-own', rules: [{ objectUniversalIdentifier: LEAD, scope: 'mineOrUnowned' }] },
        { roleId: 'b-role-all', rules: [{ objectUniversalIdentifier: LEAD, scope: 'all' }] },
        { roleId: 'c-role-stock', rules: [] },
      ],
    });
  });

  it('names the ruled objects even with no mixed role, so a person on Twenty’s default role sees only their own leads', () => {
    expect(buildRowAccessConfig({ mixedRoles: [], modules: ROLE_MODULES }).objects).toEqual([
      { objectUniversalIdentifier: LEAD, ownerFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.salesperson },
    ]);
  });

  it('leaves out a rule on an object no module declares an owner field for', () => {
    expect(buildRowAccessConfig({ mixedRoles: [{ roleId: 'r', rowRules: { 'no-owner-field': 'mine' } }], modules: ROLE_MODULES }).roles).toEqual([
      { roleId: 'r', rules: [] },
    ]);
  });

  it('refuses a role listed twice', () => {
    expect(() =>
      buildRowAccessConfig({
        mixedRoles: [
          { roleId: 'r', rowRules: {} },
          { roleId: 'r', rowRules: {} },
        ],
        modules: ROLE_MODULES,
      }),
    ).toThrow('Role r is listed twice');
  });

  it('refuses one object named with two different owner fields', () => {
    const module = { key: 'x', label: 'X', levels: [], ownerFields: [{ objectUniversalIdentifier: LEAD, ownerFieldUniversalIdentifier: 'other-field' }] };

    expect(() => buildRowAccessConfig({ mixedRoles: [], modules: [...ROLE_MODULES, module] })).toThrow('has two owner fields');
  });
});
