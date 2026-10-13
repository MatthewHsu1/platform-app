// Code-point order, as a database sorts text: the same on every machine, whatever its language.
export const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
