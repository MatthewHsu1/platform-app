import { useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { closePopUp } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { PrintNow } from 'src/stock/printing/print-popup';
import { type LotLabelsLayoutText } from 'src/stock/printing/types/lot-labels-layout-text.type';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

type LabelQuantity = 'LOTS' | 'UNITS';
type LotFormat = '4X12' | 'ZPL';

// Lot and serial number labels of the selected transfers' lines.
export const LotLabelsLayoutForm = ({ text }: { text: LotLabelsLayoutText }) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const [labelQuantity, setLabelQuantity] = useState<LabelQuantity>('LOTS');
  const [lotFormat, setLotFormat] = useState<LotFormat>('4X12');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return lotFormat === 'ZPL' ? (
      <PrintNow report="lotLabelZpl" text={text.zplPrint} options={{ labelQuantity }} />
    ) : (
      <PrintNow report="lotLabelPdf" text={text.sheetPrint} options={{ labelQuantity }} />
    );
  }

  return (
    <PopupPanel title={t(text.title)}>
      <FieldRow label={t(text.quantityToPrint)}>
        <ChoiceSelect<LabelQuantity>
          value={labelQuantity}
          onChange={setLabelQuantity}
          options={[
            { value: 'LOTS', label: t(text.perLot) },
            { value: 'UNITS', label: t(text.perUnit) },
          ]}
        />
      </FieldRow>
      <div style={styles.muted}>{t(text.unitHelp)}</div>
      <FieldRow label={t(text.format)}>
        <ChoiceSelect<LotFormat>
          value={lotFormat}
          onChange={setLotFormat}
          options={[
            { value: '4X12', label: t(text.sheet) },
            { value: 'ZPL', label: t(text.zpl) },
          ]}
        />
      </FieldRow>
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" onClick={() => setSubmitted(true)}>
          {t(text.print)}
        </Button>
        <Button size="sm" variant="outline" onClick={closePopUp}>
          {t(text.discard)}
        </Button>
      </div>
    </PopupPanel>
  );
};
