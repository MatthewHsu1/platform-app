import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { LABELS_LAYOUT_TEXT } from 'src/stock/printing/labels/choose-labels-layout.front-component';
import { LOT_LABELS_LAYOUT_TEXT } from 'src/stock/printing/labels/choose-lot-labels-layout.front-component';
import { LabelsLayoutForm } from 'src/stock/printing/labels/labels-layout-form';
import { LotLabelsLayoutForm } from 'src/stock/printing/labels/lot-labels-layout-form';
import { queryAsUser } from 'src/stock/stock-front-graphql';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

type LabelType = 'products' | 'lots';
type LotLines = { stockMoveLines: { edges: { node: { id: string } }[] } };

const hasLotLines = async (pickingIds: string[]) =>
  (
    await queryAsUser<LotLines>(
      `query LotLines($ids: [UUID!]) {
        stockMoveLines(filter: { pickingId: { in: $ids }, lotId: { is: NOT_NULL } }, first: 1) { edges { node { id } } }
      }`,
      { ids: pickingIds },
    )
  ).stockMoveLines.edges.length > 0;

// Print Labels on transfers: the choice between product and lot labels comes only when a line has a
// lot; otherwise the product label layout opens at once.
const ChooseTypeOfLabels = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const pickingIds = useSelectedRecordIds();
  const [withLots, setWithLots] = useState<boolean | null>(null);
  const [labelType, setLabelType] = useState<LabelType>('products');
  const [chosen, setChosen] = useState<LabelType | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  useRunOnce(() => {
    if (pickingIds.length > 0) {
      hasLotLines(pickingIds)
        .then(setWithLots)
        .catch(() => {
          // Offer both kinds of labels, and say why the choice is asked.
          setCheckFailed(true);
          setWithLots(true);
        });
    }
  });

  if (pickingIds.length === 0 || withLots === false || chosen === 'products') {
    return <LabelsLayoutForm text={LABELS_LAYOUT_TEXT} />;
  }
  if (chosen === 'lots') {
    return <LotLabelsLayoutForm text={LOT_LABELS_LAYOUT_TEXT} />;
  }
  if (withLots === null) {
    return <ClosablePanel message={t('Reading the transfer lines…')} error={null} busy={false} closeLabel={t('Close')} />;
  }

  return (
    <PopupPanel title={t('Choose Type of Labels To Print')}>
      <ErrorText error={checkFailed ? t('Could not check whether the transfers have lots or serial numbers.') : null} />
      <FieldRow label={t('Labels to print')}>
        <ChoiceSelect<LabelType>
          value={labelType}
          onChange={setLabelType}
          options={[
            { value: 'products', label: t('Product Labels') },
            { value: 'lots', label: t('Lot/SN Labels') },
          ]}
        />
      </FieldRow>
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" onClick={() => setChosen(labelType)}>
          {t('Confirm')}
        </Button>
        <Button size="sm" variant="outline" onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.chooseTypeOfLabels,
  name: 'platform-stock-choose-type-of-labels',
  description: 'Asks whether to print product or lot/serial number labels of the transfers, when their lines have lots.',
  component: ChooseTypeOfLabels,
});
