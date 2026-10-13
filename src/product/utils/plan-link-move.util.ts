type ValueLink = {
  id: string;
  productTemplateAttributeLineId: string | null;
  productAttributeValueId: string | null;
};

// Puts value links on the line that stays after a merge. Two runs may move
// the same link, so `moving` holds the links as they are now: one already on
// the target stays, and only another link with the same value is a duplicate.
export const planLinkMove = ({
  moving,
  targetLineId,
  targetLinks,
}: {
  moving: ValueLink[];
  targetLineId: string;
  targetLinks: ValueLink[];
}) => {
  const movingIds = new Set(moving.map((link) => link.id));
  const taken = new Set(
    targetLinks
      .filter((link) => !movingIds.has(link.id))
      .map((link) => link.productAttributeValueId),
  );
  const move: string[] = [];
  const destroy: string[] = [];

  for (const link of moving) {
    if (link.productTemplateAttributeLineId === targetLineId) {
      taken.add(link.productAttributeValueId);
    }
  }
  for (const link of moving) {
    if (link.productTemplateAttributeLineId === targetLineId) {
      continue;
    }
    if (taken.has(link.productAttributeValueId)) {
      destroy.push(link.id);
    } else {
      taken.add(link.productAttributeValueId);
      move.push(link.id);
    }
  }

  return { move, destroy };
};
