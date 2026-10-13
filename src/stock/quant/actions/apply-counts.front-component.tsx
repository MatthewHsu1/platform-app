import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeApplyCountsPopUp } from 'src/stock/quant/actions/count-panels';
import { type ApplyCountsText } from 'src/stock/quant/types/apply-counts-text.type';
import { APPLY_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const TEXT: ApplyCountsText = {
  rows: {
    counted: msg('Counted: {counted}'),
    onHand: msg('On hand: {onHand}'),
    difference: msg('Difference: {difference}'),
  },
  adjustmentTitle: msg('Inventory adjustment reference'),
  adjustmentReason: msg('Inventory reason'),
  apply: msg('Apply'),
  conflictTitle: msg('Conflict in inventory'),
  conflictBody: msg('The stock of these rows moved after they were counted.'),
  keepCounted: msg('Keep counted quantity'),
  keepDifference: msg('Keep difference'),
  discard: msg('Discard'),
  working: msg('Working…'),
  close: msg('Close'),
  applied: msg('Counts applied.'),
  failed: msg('The counts could not be applied.'),
};

export default defineFrontComponent({
  universalIdentifier: APPLY_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-apply-counts',
  description: 'Asks for an adjustment reference, then applies the counted rows among the selected ones.',
  component: makeApplyCountsPopUp({ askName: true, text: TEXT }),
});
