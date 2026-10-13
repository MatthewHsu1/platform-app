import { isDefaultBatchName } from 'src/stock-picking-batch/utils/plan-batch-naming.util';

// The transfers whose responsible differs from the batch's. With
// `createdBefore`, a transfer made after that save is left alone: it was made
// in the batch and keeps its own responsible.
export const planResponsibleCopy = ({
  responsibleId,
  pickings,
  createdBefore,
}: {
  responsibleId: string | null;
  pickings: { id: string; responsibleUserId: string | null; createdAt?: string | null }[];
  createdBefore?: string;
}) => {
  const cutOff = createdBefore === undefined ? null : Date.parse(createdBefore);

  return pickings
    .filter(
      (picking) =>
        cutOff === null || Number.isNaN(cutOff) || picking.createdAt == null || Date.parse(picking.createdAt) <= cutOff,
    )
    .filter((picking) => picking.responsibleUserId !== responsibleId)
    .map((picking) => picking.id);
};

// When a batch save hands its responsible to its transfers. A new batch hands
// it out when it has one, and also once it has its number, so transfers that
// joined it while it was still "New" get it, with notes naming the batch. A
// run that stopped after the number was written copies on its rerun too. A
// later save hands it out when staff change the responsible or the batch gets
// a new number.
export const shouldCopyBatchResponsible = ({
  created,
  responsibleSaved,
  responsibleId,
  pickingTypeId,
  name,
  nameRead,
}: {
  created: boolean;
  responsibleSaved: boolean;
  responsibleId: string | null;
  pickingTypeId: string | null;
  name: string | null;
  nameRead: string | null;
}) =>
  created
    ? responsibleId !== null || (pickingTypeId !== null && !isDefaultBatchName(name))
    : responsibleSaved || name !== nameRead;
