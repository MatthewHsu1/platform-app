// The index drawn: each item's chance is its weight over the total. The draw
// lands on the running total, so an item of weight zero is never drawn.
export const weightedPick = (weights: number[], random: () => number) => {
  const bounds: number[] = [];
  let total = 0;

  for (const weight of weights) {
    total += weight;
    bounds.push(total);
  }
  if (total <= 0) {
    throw new Error('weightedPick needs a positive total weight.');
  }
  const point = random() * total;
  const index = bounds.findIndex((bound) => bound > point);

  return index === -1 ? bounds.length - 1 : index;
};
