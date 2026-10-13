import { type BatchValidateAnswer } from 'src/stock-picking-batch/types/batch-validate-answer.type';

// The pop-up sends its body as the transfer Validate pop-up does. The batch
// counts as one transfer: "No Backorder" answers for all of it and puts the
// less-quantities task on every transfer; "Create Backorder" makes backorders.
export const readBatchValidateAnswer = (body: Record<string, unknown>): BatchValidateAnswer => {
  const skipExpired = body.skipExpired === true;
  const backorderAnswer = body.backorderAnswer;

  if (typeof backorderAnswer !== 'object' || backorderAnswer === null) {
    return { skipExpired };
  }
  const noBackorder = (backorderAnswer as Record<string, unknown>).noBackorderButton === true;

  return noBackorder ? { skipExpired, cancelBackorder: true, logEveryTransfer: true } : { skipExpired, cancelBackorder: false };
};
