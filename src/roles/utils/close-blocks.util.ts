import { type BuildingBlock } from 'src/roles/types/building-block.type';

// The blocks in force: the chosen ones and every block they imply, all the way down. A key no
// block has (one an upgrade removed) grants nothing and is dropped.
export const closeBlocks = (blockKeys: string[], blocks: BuildingBlock[]): string[] => {
  const byKey = new Map(blocks.map((block) => [block.key, block]));
  const closed = new Set<string>();
  const pending = blockKeys.filter((key) => byKey.has(key));

  while (pending.length > 0) {
    const key = pending.pop() as string;

    if (!closed.has(key)) {
      closed.add(key);
      pending.push(...(byKey.get(key)?.implies ?? []).filter((implied) => byKey.has(implied)));
    }
  }

  return [...closed].sort();
};
