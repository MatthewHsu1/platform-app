import { isExclusionOfRefusedSave, planUndoChange } from 'src/product/utils/plan-undo-change.util';
import {
  attributeLines,
  exclusionLinks,
  exclusions,
  lineValueLinks,
} from 'src/product/variant/product-records';
import { type Records } from 'src/shared/triggers/records';
import { type UndoableChange } from 'src/product/utils/types/undoable-change.type';
import { type UndoResult } from 'src/product/variant/types/undo-result.type';

const RECORDS_BY_KIND: Record<UndoableChange['kind'], Records> = {
  lineCreated: attributeLines,
  lineArchived: attributeLines,
  lineDeleted: attributeLines,
  lineValueLinkCreated: lineValueLinks,
  lineValueLinkDeleted: lineValueLinks,
  exclusionCreated: exclusions,
  exclusionUpdated: exclusions,
  exclusionLinkCreated: exclusionLinks,
};

// An exclusion and its values are saved together, so an exclusion made with
// the refused value and left with none goes too. An older exclusion stays.
const destroyExclusionLink = async (linkId: string) => {
  const [link] = await exclusionLinks.findIncludingDeleted<{
    createdAt: string;
    productTemplateAttributeExclusionId: string | null;
  }>({ id: { eq: linkId } }, 'createdAt productTemplateAttributeExclusionId');
  const reached = await exclusionLinks.destroyMany([linkId]);
  const exclusionId = link?.productTemplateAttributeExclusionId ?? null;

  if (link === undefined || exclusionId === null) {
    return reached.length;
  }
  const [exclusion] = await exclusions.findIncludingDeleted<{ createdAt: string }>(
    { id: { eq: exclusionId } },
    'createdAt',
  );

  if (
    exclusion === undefined ||
    !isExclusionOfRefusedSave({ exclusionCreatedAt: exclusion.createdAt, linkCreatedAt: link.createdAt })
  ) {
    return reached.length;
  }
  const left = await exclusionLinks.find<{ id: string }>(
    { productTemplateAttributeExclusionId: { eq: exclusionId } },
    'id',
  );
  const emptied = left.length === 0 ? await exclusions.destroyMany([exclusionId]) : [];

  return reached.length + emptied.length;
};

// A new exclusion is refused only through its values, and each new value has
// its own run that removes the value and then the emptied exclusion. Leaving
// it to that run gives one undo and one note, whichever run comes first.
const destroyNewExclusion = async (exclusionId: string) => {
  const links = await exclusionLinks.find<{ id: string }>(
    { productTemplateAttributeExclusionId: { eq: exclusionId } },
    'id',
  );

  return links.length > 0 ? 0 : (await exclusions.destroyMany([exclusionId])).length;
};

// Returns how many rows it reached; 0 when another run undid it already or
// will undo it.
const undo = async (change: UndoableChange) => {
  const of = RECORDS_BY_KIND[change.kind];
  const action = planUndoChange(change);

  if (change.kind === 'exclusionLinkCreated') {
    return destroyExclusionLink(change.recordId);
  }
  if (change.kind === 'exclusionCreated') {
    return destroyNewExclusion(change.recordId);
  }
  switch (action.action) {
    case 'destroy':
      return (await of.destroyMany([action.recordId])).length;
    case 'restore':
      return (await of.restoreMany([action.recordId])).length;
    case 'update':
      await of.update(action.recordId, action.data);
      return 1;
  }
};

// The staff changes of one trigger batch, by product, for
// reconcileTemplates' undoChange.
export const undoChangesOf =
  (changes: { templateId: string | null | undefined; change: UndoableChange }[]) =>
  async (templateId: string): Promise<UndoResult> => {
    const own = changes.filter((entry) => entry.templateId === templateId);
    let undone = 0;

    for (const { change } of own) {
      undone += await undo(change);
    }
    return { attempted: own.length, undone };
  };
