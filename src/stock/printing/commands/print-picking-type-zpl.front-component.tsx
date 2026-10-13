import { defineFrontComponent } from 'twenty-sdk/define';

import { ZPL_PRINT_TEXT } from 'src/stock/printing/commands/print-lot-zpl.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.pickingTypeFrontComponent,
  name: 'platform-stock-print-picking-type-zpl',
  description: 'Prints operation type labels as ZPL.',
  component: makePrintPopup('pickingTypeLabelZpl', ZPL_PRINT_TEXT),
});
