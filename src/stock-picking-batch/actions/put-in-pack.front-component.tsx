import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import {
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { PUT_IN_PACK_TEXT } from 'src/stock/package/actions/put-in-pack.front-component';
import { PutInPackFlow } from 'src/stock/package/actions/put-in-pack-flow';
import { ClosablePanel, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';

// The batch routes answer these texts in the user's language. The translation
// extractor reads only front-component files, so they are listed here to reach
// the catalog; each must match its source text exactly.
export const BATCH_ROUTE_TEXTS = [
  msg('You have to set some pickings to batch.'),
  msg(
    'The following transfers cannot be added to batch transfer {batch}. Please check their states and operation types.\n\nIncompatibilities: {transfers}',
  ),
  msg('You cannot delete Done batch transfers.'),
  msg("The sequence '{sequence}' is misconfigured. Its prefix should end with a '/' separator."),
  msg('Assigned to {batch} Responsible'),
  msg('Unassigned responsible from {batch}'),
  msg('Transferred by: Batch Transfer {batch}'),
  msg('{transfers} was removed from the batch, no quantity processed'),
  msg('Please select at least two batch/wave transfers to merge.'),
  msg('Batch/Wave transfers with different operation types cannot be merged.'),
  msg('Batch transfers cannot be merged with wave transfers and vice versa.'),
  msg('Batch/Wave transfers with different states cannot be merged.'),
  msg('You cannot merge done or cancelled batch/wave transfers.'),
  msg('Batch/Wave transfers have been merged into the following transfer'),
  msg('The following batch transfer has been created'),
  msg('The following batch transfer has been updated'),
  msg('The following wave transfer has been created'),
  msg('The following wave transfer has been updated'),
  msg('The selected transfers should belong to the same operation type'),
  msg('Cannot create wave transfers'),
  msg('Only a draft batch transfer can be confirmed.'),
  msg('Only a batch transfer in progress can be validated or cancelled.'),
  msg('Nothing to check the availability for.'),
  msg('Choose the batch transfer to add the transfers to.'),
  msg('The batch transfer made from this window is already done or cancelled. Close the window and add the transfers again.'),
  msg('Choose the wave transfer to add the lines to.'),
  msg('Batch transfer confirmed.'),
  msg('Batch transfer cancelled.'),
  msg('Transfers unreserved.'),
  msg('Availability checked.'),
  msg('Batch transfer validated.'),
  msg('Batch transfer not found.'),
  msg('Move line not found.'),
  msg('Select one batch transfer at a time.'),
  msg('Put in Pack is only possible on a batch transfer that is not done or cancelled.'),
];

// Put in Pack on the open move lines of the batch's transfers: the lines are
// read first, then the transfer Put in Pack pop-ups take over.
const BatchPutInPack = () => {
  const { t } = useTranslate();
  const selectedIds = useSelectedRecordIds();
  const { error, call } = usePopUpCall(t(PUT_IN_PACK_TEXT.failed));
  const [moveLineIds, setMoveLineIds] = useState<string[] | null>(null);

  useRunOnce(() => {
    if (selectedIds.length > 0) {
      void call<{ moveLineIds: string[] }>(STOCK_PICKING_BATCH_ROUTE_PATHS.putInPackLines, { batchIds: selectedIds }).then((result) => {
        if (result !== null) {
          setMoveLineIds(result.moveLineIds);
        }
      });
    }
  });

  if (selectedIds.length === 0) {
    return <ClosablePanel message={null} error={t(PUT_IN_PACK_TEXT.selectAll)} busy={false} closeLabel={t(PUT_IN_PACK_TEXT.close)} />;
  }
  if (moveLineIds === null) {
    return (
      <ClosablePanel message={error === null ? t('Reading the lines to pack…') : null} error={error} busy={false} closeLabel={t(PUT_IN_PACK_TEXT.close)} />
    );
  }

  return <PutInPackFlow moveLineIds={moveLineIds} text={PUT_IN_PACK_TEXT} />;
};

export default defineFrontComponent({
  universalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.putInPack,
  name: 'stock-picking-batch-put-in-pack',
  description: "Puts the open move lines of the batch's transfers in a package.",
  component: BatchPutInPack,
});
