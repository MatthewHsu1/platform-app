import { useState } from 'react';
import { useSelectedObjectMetadata, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { closePopUp, ErrorText, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { PrintNow } from 'src/stock/printing/print-popup';
import { type LabelsLayoutText } from 'src/stock/printing/types/labels-layout-text.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';
import { type ProductLabelOptions } from 'src/stock/printing/types/product-label-options.type';
import { type ZplTemplate } from 'src/stock/printing/types/zpl-template.type';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

const FORMATS: ProductLabelFormat[] = ['DYMO', 'PRICE_2X7', 'PRICE_4X7', 'PLAIN_4X12', 'PRICE_4X12', 'ZPL', 'ZPL_PRICE'];
const ZPL_TEMPLATES: ZplTemplate[] = ['normal', 'small', 'alternative', 'jewelry'];

type PricelistPage = { productPricelists: { edges: { node: { id: string; name: string | null } }[] } };

// The pricelists the user can read and that are in use.
const loadPricelists = async () =>
  (
    await queryAsUser<PricelistPage>(
      `{ productPricelists(filter: { active: { eq: true } }, orderBy: [{ sequence: AscNullsLast }, { name: AscNullsLast }], first: 200) {
        edges { node { id name } }
      } }`,
    )
  ).productPricelists.edges.map(({ node }) => ({ value: node.id, label: node.name ?? '' }));

// Opened from products, product variants or transfers. From a transfer the labels follow the
// operation quantities unless the user asks for a number of copies.
export const LabelsLayoutForm = ({ text }: { text: LabelsLayoutText }) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const fromTransfer = useSelectedObjectMetadata()?.nameSingular === 'stockPicking';
  const [format, setFormat] = useState<ProductLabelFormat>('PRICE_2X7');
  const [copies, setCopies] = useState('1');
  const [chosenMoveQuantity, setMoveQuantity] = useState<'MOVE' | 'CUSTOM' | null>(null);
  const [zplTemplate, setZplTemplate] = useState<ZplTemplate>('normal');
  const [pricelistId, setPricelistId] = useState('');
  const [pricelists, setPricelists] = useState<{ value: string; label: string }[]>([]);
  const [pricelistsFailed, setPricelistsFailed] = useState(false);
  const [extraContent, setExtraContent] = useState('');
  const [submitted, setSubmitted] = useState<ProductLabelOptions | null>(null);
  const isZpl = format === 'ZPL' || format === 'ZPL_PRICE';
  const moveQuantity = chosenMoveQuantity ?? (fromTransfer ? 'MOVE' : 'CUSTOM');

  useRunOnce(() => {
    loadPricelists()
      .then(setPricelists)
      .catch(() => setPricelistsFailed(true));
  });

  if (submitted !== null) {
    return <PrintNow report="productLabels" text={isZpl ? text.zplPrint : text.sheetPrint} options={submitted} />;
  }

  const print = () =>
    setSubmitted({
      format,
      copies: Math.trunc(Number(copies)),
      moveQuantity: fromTransfer ? moveQuantity : 'CUSTOM',
      ...(isZpl ? { zplTemplate } : {}),
      ...(pricelistId === '' ? {} : { pricelistId }),
      ...(format === 'PRICE_2X7' && extraContent !== '' ? { extraContent } : {}),
    });

  return (
    <PopupPanel title={t(text.title)}>
      {fromTransfer ? (
        <FieldRow label={t(text.quantityToPrint)}>
          <ChoiceSelect<'MOVE' | 'CUSTOM'>
            value={moveQuantity}
            onChange={setMoveQuantity}
            options={[
              { value: 'MOVE', label: t(text.operationQuantities) },
              { value: 'CUSTOM', label: t(text.custom) },
            ]}
          />
        </FieldRow>
      ) : null}
      {fromTransfer && moveQuantity === 'MOVE' ? null : (
        <FieldRow label={t(text.copies)}>
          <Input value={copies} type="number" step={1} onValueChange={setCopies} />
        </FieldRow>
      )}
      <FieldRow label={t(text.format)}>
        <ChoiceSelect<ProductLabelFormat>
          value={format}
          onChange={setFormat}
          options={FORMATS.map((value) => ({ value, label: t(text.formats[value]) }))}
        />
      </FieldRow>
      <FieldRow label={t(text.pricelist)}>
        <ChoiceSelect value={pricelistId} onChange={setPricelistId} options={[{ value: '', label: '' }, ...pricelists]} />
      </FieldRow>
      <ErrorText error={pricelistsFailed ? t(text.pricelistsFailed) : null} />
      {format === 'PRICE_2X7' ? (
        <FieldRow label={t(text.extraContent)}>
          <Input value={extraContent} onValueChange={setExtraContent} />
        </FieldRow>
      ) : null}
      {isZpl ? (
        <FieldRow label={t(text.zplTemplate)}>
          <ChoiceSelect<ZplTemplate>
            value={zplTemplate}
            onChange={setZplTemplate}
            options={ZPL_TEMPLATES.map((value) => ({ value, label: t(text.zplTemplates[value]) }))}
          />
        </FieldRow>
      ) : null}
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" onClick={print}>
          {t(text.print)}
        </Button>
        <Button size="sm" variant="outline" onClick={closePopUp}>
          {t(text.discard)}
        </Button>
      </div>
    </PopupPanel>
  );
};
