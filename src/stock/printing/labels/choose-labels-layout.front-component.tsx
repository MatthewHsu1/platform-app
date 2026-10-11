import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { ZPL_PRINT_TEXT } from 'src/stock/printing/commands/print-lot-zpl.front-component';
import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { LabelsLayoutForm } from 'src/stock/printing/labels/labels-layout-form';
import { type LabelsLayoutText } from 'src/stock/printing/types/labels-layout-text.type';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const LABELS_LAYOUT_TEXT: LabelsLayoutText = {
  title: msg('Choose Labels Layout'),
  quantityToPrint: msg('Quantity to print'),
  operationQuantities: msg('Operation Quantities'),
  custom: msg('Custom'),
  copies: msg('Copies'),
  format: msg('Format'),
  formats: {
    DYMO: msg('Dymo'),
    PRICE_2X7: msg('2 x 7 with price'),
    PRICE_4X7: msg('4 x 7 with price'),
    PLAIN_4X12: msg('4 x 12'),
    PRICE_4X12: msg('4 x 12 with price'),
    ZPL: msg('ZPL Labels'),
    ZPL_PRICE: msg('ZPL Labels with price'),
  },
  pricelist: msg('Pricelist'),
  extraContent: msg('Extra Content'),
  zplTemplate: msg('ZPL Template'),
  zplTemplates: {
    normal: msg('Normal (2.25" x 1.25")'),
    small: msg('Small (1.25" x 1.00")'),
    alternative: msg('Alternative (2.00" x 1.00")'),
    jewelry: msg('Jewelry (2.20" x 0.50")'),
  },
  print: msg('Print'),
  discard: msg('Discard'),
  sheetPrint: { ...PRINT_TEXT, open: msg('Open the labels') },
  zplPrint: ZPL_PRINT_TEXT,
};

const ChooseLabelsLayout = () => <LabelsLayoutForm text={LABELS_LAYOUT_TEXT} />;

export default defineFrontComponent({
  universalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.chooseLabelsLayout,
  name: 'platform-stock-choose-labels-layout',
  description: 'Asks for the sheet layout, copies and pricelist, then prints product labels.',
  component: ChooseLabelsLayout,
});
