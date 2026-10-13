import { type TimeInterval } from 'src/resource/types/time-interval.type';

// Overlapping intervals become one; intervals that only touch stay two, so each working period keeps its
// own boundaries.
export const normalizeIntervals = (intervals: TimeInterval[]) => {
  const sorted = intervals
    .filter((item) => item.start < item.stop)
    .sort((left, right) => left.start - right.start || left.stop - right.stop);
  const merged: TimeInterval[] = [];

  for (const item of sorted) {
    const last = merged[merged.length - 1];

    if (last !== undefined && item.start < last.stop) {
      last.stop = Math.max(last.stop, item.stop);
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
};

export const subtractIntervals = (from: TimeInterval[], remove: TimeInterval[]) => {
  const cuts = normalizeIntervals(remove);

  return normalizeIntervals(from).flatMap((piece) =>
    cuts.reduce<TimeInterval[]>(
      (pieces, cut) =>
        pieces.flatMap((part) =>
          cut.stop <= part.start || cut.start >= part.stop
            ? [part]
            : [
                ...(part.start < cut.start ? [{ start: part.start, stop: cut.start }] : []),
                ...(cut.stop < part.stop ? [{ start: cut.stop, stop: part.stop }] : []),
              ],
        ),
      [piece],
    ),
  );
};
