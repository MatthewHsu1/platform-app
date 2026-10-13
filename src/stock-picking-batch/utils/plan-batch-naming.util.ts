import { DEFAULT_BATCH_NAME } from 'src/stock-picking-batch/stock-picking-batch-options.constant';

export const isDefaultBatchName = (name: string | null) => name === null || name === '' || name === DEFAULT_BATCH_NAME;

// A batch takes a number when it gets an operation type, on create or later,
// and a new one when staff change the type. The app writing a refused type
// back is not a new type. A name that moved on since the save means an
// earlier run already numbered it, so a rerun takes no second number.
export const shouldNameBatch = ({
  created,
  staffChange,
  pickingTypeId,
  pickingTypeIdBefore,
  name,
  nameBefore,
}: {
  created: boolean;
  staffChange: boolean;
  pickingTypeId: string | null;
  pickingTypeIdBefore: string | null;
  name: string | null;
  nameBefore: string | null;
}) => {
  if (pickingTypeId === null) {
    return false;
  }
  if (created) {
    return isDefaultBatchName(name);
  }
  return (
    pickingTypeId !== pickingTypeIdBefore && name === nameBefore && (staffChange || pickingTypeIdBefore === null)
  );
};
