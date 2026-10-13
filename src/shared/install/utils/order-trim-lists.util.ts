// The trim has a time limit, so the lists named first go before the others,
// which keep their order. With `onlyFirst`, the others are left out.
export const orderTrimLists = <TList extends { universalIdentifier: string }>(
  lists: TList[],
  first: string[],
  { onlyFirst = false }: { onlyFirst?: boolean } = {},
): TList[] => {
  const named = first.flatMap((universalIdentifier) => lists.filter((list) => list.universalIdentifier === universalIdentifier));

  return onlyFirst ? named : [...named, ...lists.filter((list) => !first.includes(list.universalIdentifier))];
};
