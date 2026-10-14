type SubtreeRow = {
  kind: 'location' | 'equipment';
};

type SubtreeCounts = {
  locations: number;
  equipment: number;
};

// Counts the pre-collected subtree rows by their kind discriminator.
export const subtreeCounts = (descendants: Array<SubtreeRow>): SubtreeCounts => {
  let locations = 0;
  let equipment = 0;
  for (const descendant of descendants) {
    if (descendant.kind === 'location') {
      locations += 1;
    } else if (descendant.kind === 'equipment') {
      equipment += 1;
    }
  }
  return { locations, equipment };
};
