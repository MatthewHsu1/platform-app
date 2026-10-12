import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type RoleModule } from 'src/roles/types/role-module.type';

// "Employee + Inventory User + Sales: Own Documents": Employee, then each module's highest level in
// module order (the levels below it are implied and left out).
export const mixedRoleLabel = (closedKeys: string[], blocks: BuildingBlock[], modules: RoleModule[]): string => {
  const labelOf = (key: string) => blocks.find((block) => block.key === key)?.label ?? key;
  const highest = modules.flatMap((module) => {
    const level = [...module.levels].reverse().find((candidate) => candidate.blockKey !== null && closedKeys.includes(candidate.blockKey));

    return level?.blockKey ? [labelOf(level.blockKey)] : [];
  });

  return [...(closedKeys.includes(BLOCK_KEYS.employee) ? [labelOf(BLOCK_KEYS.employee)] : []), ...highest].join(' + ');
};
