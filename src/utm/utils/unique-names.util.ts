// "Name [12]" → ["Name", 12]. Only a counter after a space counts; anything
// else is part of the name.
const COUNTER_PATTERN = /^(.*)\s+\[([0-9]+)\]/;

export const splitNameAndCount = (name: string): [string, number] => {
  const match = COUNTER_PATTERN.exec(name);

  return match === null ? [name, 1] : [match[1], Number.parseInt(match[2], 10)];
};

// Names stay unique by a counter: "test", "test [2]", … An asked counter is
// kept when free; otherwise the next free counter is used. Names in one call
// count against each other. The comparison keeps the case.
export const uniqueNames = (requested: (string | null)[], existing: string[]): (string | null)[] => {
  const used = new Map<string, Set<number>>();

  for (const name of requested) {
    if (name === null || name === '') {
      continue;
    }

    const [base] = splitNameAndCount(name);

    if (!used.has(base)) {
      used.set(
        base,
        new Set(existing.filter((other) => other === base || other.startsWith(`${base} [`)).map((other) => splitNameAndCount(other)[1])),
      );
    }
  }

  const nextFree = new Map<string, number>();

  return requested.map((name) => {
    if (name === null || name === '') {
      return null;
    }

    const [base, asked] = splitNameAndCount(name);
    const taken = used.get(base) ?? new Set<number>();
    let count = asked;

    // A counter of 0 counts as none asked.
    if (asked === 0 || taken.has(asked)) {
      count = nextFree.get(base) ?? 1;

      while (taken.has(count)) {
        count += 1;
      }
      nextFree.set(base, count + 1);
    }

    taken.add(count);
    used.set(base, taken);

    return count > 1 ? `${base} [${count}]` : base;
  });
};
