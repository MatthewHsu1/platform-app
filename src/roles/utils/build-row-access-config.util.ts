import { type RoleModule } from 'src/roles/types/role-module.type';
import { type RowAccessConfig } from 'src/roles/types/row-access-config.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';

const byText = (left: string, right: string) => left.localeCompare(right);

// The row rule list the server reads. Sorted, so an unchanged list serialises the same and a second
// run writes nothing.
export const buildRowAccessConfig = ({
  mixedRoles,
  modules,
}: {
  mixedRoles: { roleId: string; rowRules: Record<string, RowRuleScope> }[];
  modules: RoleModule[];
}): RowAccessConfig => {
  const ownerFieldByObject = new Map<string, string>();

  for (const entry of modules.flatMap((module) => module.ownerFields)) {
    const known = ownerFieldByObject.get(entry.objectUniversalIdentifier);

    if (known !== undefined && known !== entry.ownerFieldUniversalIdentifier) {
      throw new Error(`Object ${entry.objectUniversalIdentifier} has two owner fields: ${known} and ${entry.ownerFieldUniversalIdentifier}.`);
    }
    ownerFieldByObject.set(entry.objectUniversalIdentifier, entry.ownerFieldUniversalIdentifier);
  }

  const roleIds = mixedRoles.map(({ roleId }) => roleId);
  const repeated = roleIds.find((roleId, index) => roleIds.indexOf(roleId) !== index);

  if (repeated !== undefined) {
    throw new Error(`Role ${repeated} is listed twice in the row access rules.`);
  }

  return {
    version: 2,
    objects: [...ownerFieldByObject.keys()]
      .sort(byText)
      .map((objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        ownerFieldUniversalIdentifier: ownerFieldByObject.get(objectUniversalIdentifier) as string,
      })),
    roles: [...mixedRoles]
      .sort((left, right) => byText(left.roleId, right.roleId))
      .map(({ roleId, rowRules }) => ({
        roleId,
        rules: Object.entries(rowRules)
          .filter(([objectUniversalIdentifier]) => ownerFieldByObject.has(objectUniversalIdentifier))
          .sort(([left], [right]) => byText(left, right))
          .map(([objectUniversalIdentifier, scope]) => ({ objectUniversalIdentifier, scope })),
      })),
  };
};
