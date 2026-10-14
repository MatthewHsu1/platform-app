type LocationOwner = {
  personId: string | null;
  companyId: string | null;
};

// A location without its own owner inherits the parent owner. A location that
// already has an owner keeps it, and a root without an owner stays empty:
// root self-ownership linking happens in wiring, not in this planner.
export const planOwnerInherit = (
  ownOwner: LocationOwner,
  parentOwner: LocationOwner | null,
): LocationOwner => {
  if (ownOwner.personId !== null || ownOwner.companyId !== null) {
    return { personId: ownOwner.personId, companyId: ownOwner.companyId };
  }
  if (parentOwner !== null) {
    return { personId: parentOwner.personId, companyId: parentOwner.companyId };
  }
  return { personId: null, companyId: null };
};
