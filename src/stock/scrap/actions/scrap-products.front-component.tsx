import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, Trans, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { describeRouteError } from 'src/shared/describe-route-error';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { InsufficientQuantityPanel, readRefusedScrapId } from 'src/stock/scrap/actions/scrap-panels';
import { type InsufficientQuantityText } from 'src/stock/scrap/types/insufficient-quantity-text.type';
import { type ScrapChoices } from 'src/stock/scrap/types/scrap-choices.type';
import { type ScrapValidateAnswer } from 'src/stock/scrap/types/scrap-validate-answer.type';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  DISCARD_SCRAP_ROUTE_PATH,
  SCRAP_CHOICES_ROUTE_PATH,
  SCRAP_PRODUCTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SCRAP_PRODUCTS_ROUTE_PATH,
  VALIDATE_SCRAP_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

type Insufficient = Extract<ScrapValidateAnswer, { kind: 'needsAnswer' }>;

const INSUFFICIENT_TEXT: InsufficientQuantityText = {
  title: msg('Insufficient quantity to scrap'),
  body: msg('{location} holds less than {quantity} {unit} of {product}. Scrapping anyway may leave the stock out of step with the shelves.'),
  currentStock: msg('Stock in internal locations'),
  confirm: msg('Confirm'),
  discard: msg('Discard'),
};

// "Scrap" on a transfer: only the goods its moves carry, the source and scrap locations it starts with.
const ScrapProducts = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const pickingId = selectedIds[0] ?? null;
  const fallbackError = t('The scrap could not be validated.');
  const { busy: calling, error, setError, call } = usePopUpCall(fallbackError);
  const [creating, setCreating] = useState(false);
  const busy = calling || creating;
  const [savedScrapId, setSavedScrapId] = useState<string | null>(null);
  const [choices, setChoices] = useState<ScrapChoices | null>(null);
  const [productId, setProductId] = useState('');
  const [productUomId, setProductUomId] = useState('');
  const [scrapQty, setScrapQty] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [scrapLocationId, setScrapLocationId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [reasonTagIds, setReasonTagIds] = useState<string[]>([]);
  const [shouldReplenish, setShouldReplenish] = useState(false);
  const [insufficient, setInsufficient] = useState<Insufficient | null>(null);

  useRunOnce(() => {
    const load = async () => {
      const loaded = await call<ScrapChoices>(SCRAP_CHOICES_ROUTE_PATH, { pickingId });

      if (loaded === null) {
        return;
      }
      setChoices(loaded);
      setProductId(loaded.products[0]?.id ?? '');
      setProductUomId(loaded.products[0]?.units[0]?.id ?? '');
      setLocationId(loaded.defaults.locationId ?? '');
      setScrapLocationId(loaded.defaults.scrapLocationId ?? '');
    };

    if (pickingId !== null) {
      void load();
    }
  });

  const units = choices?.products.find((product) => product.id === productId)?.units ?? [];

  const pickProduct = (nextProductId: string) => {
    setProductId(nextProductId);
    setProductUomId(choices?.products.find((product) => product.id === nextProductId)?.units[0]?.id ?? '');
  };

  const toggleTag = (tagId: string) =>
    setReasonTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]));

  const showAnswer = async (result: ScrapValidateAnswer) => {
    if (result.kind === 'needsAnswer') {
      setInsufficient(result);
      return;
    }
    await finishWith(t('Scrap done.'));
  };

  // A refusal after the scrap was made names it: the scrap stays a draft and the next Validate retries that one.
  const createAndValidate = async () => {
    setCreating(true);
    setError(null);
    try {
      return await postAppRoute<{ scrapId: string } & ScrapValidateAnswer>(SCRAP_PRODUCTS_ROUTE_PATH, {
        pickingId,
        productId,
        productUomId,
        scrapQty: Number(scrapQty),
        locationId,
        scrapLocationId,
        ownerId: ownerId === '' ? null : ownerId,
        reasonTagIds,
        shouldReplenish,
      });
    } catch (caught) {
      setSavedScrapId(readRefusedScrapId(caught));
      setError(describeRouteError(caught, fallbackError));
      return null;
    } finally {
      setCreating(false);
    }
  };

  const validate = async () => {
    const result =
      savedScrapId === null
        ? await createAndValidate()
        : await call<ScrapValidateAnswer>(VALIDATE_SCRAP_ROUTE_PATH, { scrapIds: [savedScrapId], confirmInsufficient: false });

    if (result !== null) {
      await showAnswer(result);
    }
  };

  const confirmInsufficient = async (scrapId: string) => {
    if ((await call(VALIDATE_SCRAP_ROUTE_PATH, { scrapIds: [scrapId], confirmInsufficient: true })) !== null) {
      await finishWith(t('Scrap done.'));
    }
  };

  const discardInsufficient = async (scrapId: string) => {
    if ((await call(DISCARD_SCRAP_ROUTE_PATH, { scrapIds: [scrapId] })) !== null) {
      await finishWith(t('Scrap discarded.'));
    }
  };

  if (pickingId === null) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }
  if (insufficient !== null) {
    return (
      <InsufficientQuantityPanel
        answer={insufficient}
        text={INSUFFICIENT_TEXT}
        busy={busy}
        error={error}
        onConfirm={() => void confirmInsufficient(insufficient.scrapId)}
        onDiscard={() => void discardInsufficient(insufficient.scrapId)}
      />
    );
  }
  if (savedScrapId !== null) {
    return (
      <div style={styles.panel}>
        <div style={styles.title}>
          <Trans>Scrap products</Trans>
        </div>
        <div>{t('The scrap was saved as a draft. Validate tries it again; Close keeps the draft.')}</div>
        <ErrorText error={error} />
        <div style={styles.buttons}>
          <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void validate()}>
            {t('Validate')}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
            {t('Close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Scrap products</Trans>
      </div>
      <select
        style={styles.select}
        title={t('Product')}
        value={productId}
        onChange={(event) => pickProduct(event.target.value)}
      >
        {(choices?.products ?? []).map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <div style={styles.row}>
        <Input type="number" value={scrapQty} placeholder={t('Quantity')} onValueChange={setScrapQty} />
        <select
          style={styles.select}
          title={t('Unit')}
          value={productUomId}
          onChange={(event) => setProductUomId(event.target.value)}
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>
      <select
        style={styles.select}
        title={t('Source location')}
        value={locationId}
        onChange={(event) => setLocationId(event.target.value)}
      >
        <option value="">{t('Source location')}</option>
        {(choices?.locations ?? []).map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <select
        style={styles.select}
        title={t('Scrap location')}
        value={scrapLocationId}
        onChange={(event) => setScrapLocationId(event.target.value)}
      >
        <option value="">{t('Scrap location')}</option>
        {(choices?.scrapLocations ?? []).map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <select style={styles.select} title={t('Owner')} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
        <option value="">{t('No owner')}</option>
        {(choices?.owners ?? []).map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name}
          </option>
        ))}
      </select>
      {(choices?.reasonTags ?? []).length > 0 ? <div style={styles.title}>{t('Scrap reason')}</div> : null}
      {(choices?.reasonTags ?? []).map((tag) => (
        <label key={tag.id} style={styles.row}>
          <input type="checkbox" checked={reasonTagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
          {tag.name}
        </label>
      ))}
      <label style={styles.row}>
        <input type="checkbox" checked={shouldReplenish} onChange={(event) => setShouldReplenish(event.target.checked)} />
        {t('Replenish quantities')}
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={busy || choices === null || productId === ''}
          onClick={() => void validate()}
        >
          {t('Validate')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SCRAP_PRODUCTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-products',
  description: 'Scraps goods of the open transfer: product, quantity, unit, locations, owner, reasons.',
  component: ScrapProducts,
});
