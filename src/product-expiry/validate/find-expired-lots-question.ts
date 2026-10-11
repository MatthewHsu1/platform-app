import { expiryConfirmationNeeded } from 'src/product-expiry/utils/expiry-confirmation.util';
import { EXPIRY_LINE_SELECTION, toExpiryLine } from 'src/product-expiry/utils/expiry-line.util';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { type ExpiryLineNode } from 'src/product-expiry/types/expiry-line-node.type';
import { type ExpiryQuestion } from 'src/product-expiry/utils/types/expiry-question.type';

// Lines already done or cancelled are not delivered by this Validate.
export const findExpiredLotsQuestion = async (pickingIds: string[]): Promise<ExpiryQuestion | null> =>
  expiryConfirmationNeeded(
    (
      await stockMoveLines.find<ExpiryLineNode>(
        { pickingId: { in: pickingIds }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } },
        EXPIRY_LINE_SELECTION,
      )
    ).map(toExpiryLine),
    new Date(),
  );
