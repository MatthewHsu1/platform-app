import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Checkbox, Input, Textarea } from 'twenty-ui/primitives/input';

import {
  GENERATE_LOT_LINES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  GENERATE_LOT_LINES_ROUTE_PATH,
} from 'src/stock/lot/actions/lot-actions-universal-identifiers.constant';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readStockStyles } from 'src/stock/stock-theme';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';
import { nextSerial } from 'src/stock/utils/generate-lot-names.util';
import { randomId } from 'src/shared/utils/random-id.util';

type Mode = 'GENERATE' | 'IMPORT';

type MoveInfo = {
  productUomQty: number | null;
  quantity: number | null;
  productId: string | null;
  product: { productTmpl: { tracking: ProductTracking | null } | null } | null;
};

// The default first name follows the product's newest lot, newest by creation.
const loadMove = async (moveId: string) => {
  // Twenty drops a relation nested under a to-one relation unless that
  // relation also selects deletedAt.
  const data = await queryAsUser<{ stockMove: MoveInfo | null }>(
    `query GenerateMove($id: UUID!) {
      stockMove(filter: { id: { eq: $id } }) { productUomQty quantity productId product { deletedAt productTmpl { tracking } } }
    }`,
    { id: moveId },
  );
  const move = data.stockMove;

  if (move === null || move.productId === null) {
    return { move, newestLotName: null };
  }
  const lots = await queryAsUser<{ stockLots: { edges: { node: { name: string | null } }[] } }>(
    `query NewestLot($productId: UUID!) {
      stockLots(filter: { productId: { eq: $productId } }, orderBy: [{ createdAt: DescNullsLast }], first: 1) {
        edges { node { name } }
      }
    }`,
    { productId: move.productId },
  );

  return { move, newestLotName: lots.stockLots.edges[0]?.node.name ?? null };
};

const readNumber = (text: string) => {
  const value = Number.parseFloat(text);

  return Number.isFinite(value) ? value : null;
};

const GenerateLotLines = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const moveId = selectedIds.length === 1 ? selectedIds[0] : null;
  const { busy, error, setError, call } = usePopUpCall(t('The lines could not be created.'));
  const [tracking, setTracking] = useState<ProductTracking | null>(null);
  const [mode, setMode] = useState<Mode>('GENERATE');
  const [firstLot, setFirstLot] = useState('');
  const [count, setCount] = useState('2');
  const [quantityReceived, setQuantityReceived] = useState('');
  const [text, setText] = useState('');
  const [keepLines, setKeepLines] = useState(false);
  // One id per opening of the pop-up: a second click finds the lines the first one made.
  const [runId] = useState(randomId);

  useRunOnce(() => {
    if (moveId === null) {
      return;
    }
    loadMove(moveId)
      .then(({ move, newestLotName }) => {
        if (move === null) {
          setError(t('The move could not be read.'));
          return;
        }
        const productTracking = move.product?.productTmpl?.tracking ?? PRODUCT_TRACKING.NONE;

        setTracking(productTracking);
        setFirstLot(nextSerial({ tracking: productTracking, newestLotName }) ?? '');
        setCount(String(move.productUomQty || 2));
        setQuantityReceived(String(move.quantity ?? 0));
      })
      .catch(() => setError(t('The move could not be read.')));
  });

  const generate = async () => {
    const result = await call<{ lineIds: string[] }>(GENERATE_LOT_LINES_ROUTE_PATH, {
      moveId,
      runId,
      mode,
      firstLot,
      count: readNumber(count),
      quantityReceived: readNumber(quantityReceived),
      text,
      keepLines,
    });

    if (result !== null) {
      await finishWith(t('Lines created.'));
    }
  };

  if (moveId === null) {
    return <ClosablePanel message={null} error={t('Select one stock move.')} busy={false} closeLabel={t('Close')} />;
  }
  if (tracking === PRODUCT_TRACKING.NONE) {
    return (
      <ClosablePanel
        message={null}
        error={t('This product is not tracked by lots or serial numbers.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  const isLot = tracking === PRODUCT_TRACKING.LOT;

  return (
    <PopupPanel title={t('Generate Serials/Lots')}>
      <FieldRow label={t('Mode')}>
        <ChoiceSelect<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'GENERATE', label: t('Generate') },
            { value: 'IMPORT', label: t('Import') },
          ]}
        />
      </FieldRow>
      {mode === 'GENERATE' ? (
        <>
          <FieldRow label={isLot ? t('First lot number') : t('First serial number')}>
            <Input value={firstLot} onValueChange={setFirstLot} />
          </FieldRow>
          <FieldRow label={isLot ? t('Quantity per lot') : t('Number of serial numbers')}>
            <Input value={count} type="number" step={isLot ? 'any' : 1} onValueChange={setCount} />
          </FieldRow>
          {isLot ? (
            <FieldRow label={t('Quantity received')}>
              <Input value={quantityReceived} type="number" step="any" onValueChange={setQuantityReceived} />
            </FieldRow>
          ) : null}
        </>
      ) : (
        <FieldRow label={isLot ? t('Lot numbers') : t('Serial numbers')}>
          <Textarea
            value={text}
            rows={8}
            placeholder={t('One name per row, then a quantity and an expiration date if wanted.')}
            onValueChange={setText}
          />
        </FieldRow>
      )}
      <label style={styles.row}>
        <Checkbox checked={keepLines} onCheckedChange={setKeepLines} />
        <span>{t('Keep current lines')}</span>
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy || tracking === null} onClick={() => void generate()}>
          {t('Generate')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: GENERATE_LOT_LINES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-move-generate-lot-lines',
  description: 'Generates or imports the lot/serial numbers of a tracked move.',
  component: GenerateLotLines,
});
