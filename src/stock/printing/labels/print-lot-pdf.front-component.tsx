import { defineFrontComponent } from 'twenty-sdk/define';

import { LOT_LABELS_TEXT } from 'src/stock/printing/labels/choose-lot-labels-layout.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.lotPdfFrontComponent,
  name: 'platform-stock-print-lot-pdf',
  description: 'Prints lot and serial number labels on a 4 x 12 sheet.',
  component: makePrintPopup('lotLabelPdf', LOT_LABELS_TEXT),
});
