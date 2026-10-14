import { type LocationInventoryInput } from 'src/fieldservice-stock/types/location-inventory-input.type';

type LocationInventoryWrite = { id: string; inventoryLocationId: string };

// A location's stock location follows its parent's. A location without one (new, or cleared) takes its parent's,
// else that of the contact or company it was made from, else the default (Customers). A location moved under a new parent
// takes the parent's, and when a location's stock location changes every location below it takes the new value
// in the same pass, even one set by hand earlier. A value written in this batch is kept for that location.
// Returns only the locations whose value must change.
export const planLocationInventory = (input: LocationInventoryInput): LocationInventoryWrite[] => {
  const byId = new Map(input.rows.map((row) => [row.id, row]));
  const childrenOf = new Map<string, string[]>();
  const final = new Map<string, string | null>();
  const changed = new Set<string>(input.inventoryWritten);
  const writes: LocationInventoryWrite[] = [];

  for (const row of input.rows) {
    if (row.parentId !== null && byId.has(row.parentId)) {
      childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row.id]);
    }
  }
  const visit = (id: string) => {
    const row = byId.get(id);

    if (row === undefined || final.has(id)) {
      return;
    }
    const parent = row.parentId === null ? undefined : byId.get(row.parentId);
    const parentValue = parent === undefined ? null : (final.get(parent.id) ?? null);
    const parentMoved = parent !== undefined && changed.has(parent.id);
    let value = row.inventoryLocationId;

    if (value === null) {
      value = parentValue ?? row.partnerLocationId ?? input.defaultLocationId;
    } else if (
      !input.created.includes(id) &&
      !input.inventoryWritten.includes(id) &&
      parentValue !== null &&
      (input.parentWritten.includes(id) || parentMoved)
    ) {
      value = parentValue;
    }
    final.set(id, value);
    if (value !== null && value !== row.inventoryLocationId) {
      writes.push({ id, inventoryLocationId: value });
      changed.add(id);
    }
    for (const childId of childrenOf.get(id) ?? []) {
      visit(childId);
    }
  };

  for (const row of input.rows) {
    if (row.parentId === null || !byId.has(row.parentId)) {
      visit(row.id);
    }
  }
  return writes;
};
