import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type MixTable } from 'src/roles/types/mix-table.type';
import { mixedRoleId } from 'src/roles/utils/mixed-role-id.util';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isKeyList = (value: unknown): value is string[] => Array.isArray(value) && value.every((key) => typeof key === 'string');

// Any member can write the app's key-value store, so an entry counts only when every key names a
// block of this version and its role id is the one derived from this workspace and those keys: a
// changed entry can never widen or strip a role, and no entry can point the sync at a role
// Platform did not make.
export const verifyMixTable = ({
  raw,
  workspaceId,
  blocks = BUILDING_BLOCKS,
}: {
  raw: unknown;
  workspaceId: string;
  blocks?: BuildingBlock[];
}): { table: MixTable; ignoredRoleIds: string[] } => {
  const known = new Set(blocks.map((block) => block.key));
  const table: MixTable = { version: 1, roles: {} };
  const ignoredRoleIds: string[] = [];
  const roles = isRecord(raw) && isRecord(raw.roles) ? raw.roles : {};

  for (const [roleId, keys] of Object.entries(roles)) {
    if (isKeyList(keys) && keys.every((key) => known.has(key)) && mixedRoleId(workspaceId, keys) === roleId) {
      table.roles[roleId] = [...keys].sort();
    } else {
      ignoredRoleIds.push(roleId);
    }
  }

  return { table, ignoredRoleIds };
};

export const canonicalMixTable = (table: MixTable): MixTable => ({
  version: 1,
  roles: Object.fromEntries(Object.entries(table.roles).sort(([left], [right]) => left.localeCompare(right))),
});

const sameKeys = (left: string[], right: string[]) => left.length === right.length && [...left].sort().every((key, index) => key === [...right].sort()[index]);

// The store hands keys back in its own order, so the stored table is compared by meaning: the same
// entries with the same block keys, in any order.
export const isSameMixTable = (raw: unknown, table: MixTable): boolean => {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.roles)) {
    return false;
  }
  const stored = raw.roles;

  return (
    Object.keys(stored).length === Object.keys(table.roles).length &&
    Object.entries(table.roles).every(([roleId, keys]) => {
      const storedKeys = stored[roleId];

      return isKeyList(storedKeys) && sameKeys(storedKeys, keys);
    })
  );
};
