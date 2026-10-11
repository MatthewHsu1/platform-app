import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { ZPL_PRINT_TEXT } from 'src/stock/printing/commands/print-lot-zpl.front-component';
import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { LotLabelsLayoutForm } from 'src/stock/printing/labels/lot-labels-layout-form';
import { type LotLabelsLayoutText } from 'src/stock/printing/types/lot-labels-layout-text.type';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const LOT_LABELS_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open the lot labels') };

export const LOT_LABELS_LAYOUT_TEXT: LotLabelsLayoutText = {
  title: msg('Choose Lot Labels Layout'),
  quantityToPrint: msg('Quantity to print'),
  perLot: msg('One per lot/SN'),
  perUnit: msg('One per unit'),
  unitHelp: msg('A lot whose unit is not a unit like Units counts as one and prints one label.'),
  format: msg('Format'),
  sheet: msg('4 x 12'),
  zpl: msg('ZPL Labels'),
  print: msg('Print'),
  discard: msg('Discard'),
  sheetPrint: LOT_LABELS_TEXT,
  zplPrint: ZPL_PRINT_TEXT,
};

const ChooseLotLabelsLayout = () => <LotLabelsLayoutForm text={LOT_LABELS_LAYOUT_TEXT} />;

export default defineFrontComponent({
  universalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.chooseLotLabelsLayout,
  name: 'platform-stock-choose-lot-labels-layout',
  description: 'Asks for one label per lot or per unit and the format, then prints the lot labels of the transfers.',
  component: ChooseLotLabelsLayout,
});
