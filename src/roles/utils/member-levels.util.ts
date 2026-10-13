import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type MemberLevels } from 'src/roles/types/member-levels.type';
import { type RoleModule } from 'src/roles/types/role-module.type';

// The blocks the Roles page's drop-downs choose. Employee is always in; an unknown module or level
// counts as None.
export const levelsToBlockKeys = (levels: MemberLevels, modules: RoleModule[]): string[] => [
  BLOCK_KEYS.employee,
  ...modules.flatMap((module) => {
    const blockKey = module.levels.find((level) => level.key === levels[module.key])?.blockKey;

    return blockKey ? [blockKey] : [];
  }),
];

// The drop-down values that show a mix: each module's highest level whose block the mix holds.
export const blockKeysToLevels = (closedKeys: string[], modules: RoleModule[]): MemberLevels =>
  Object.fromEntries(
    modules.map((module) => {
      const level = [...module.levels].reverse().find((candidate) => candidate.blockKey === null || closedKeys.includes(candidate.blockKey));

      return [module.key, level?.key ?? module.levels[0].key];
    }),
  );
