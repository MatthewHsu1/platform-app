// Twenty returns composite values (currency) as objects in a fixed key order,
// and an empty value as null or missing; both read as the same here.
export const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
