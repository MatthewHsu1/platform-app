import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { Trans, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { selectOneRecord } from 'src/shared/front-components/selection-check';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { LOCATION_USAGE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  UPDATE_QUANTITY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

type Variant = { id: string; name: string | null; productTmpl: { tracking: string | null } | null };
type LotOption = { id: string; name: string | null; productId: string | null };
type LocationOption = { id: string; completeName: string | null };
// `edited`: the user typed in the line, or added it. Only those are sent; an untouched line keeps its stock even when
// it moved since the list was read.
type Row = {
  key: string;
  quantId: string | null;
  productId: string;
  locationId: string;
  lotId: string | null;
  onHand: number;
  counted: string;
  edited: boolean;
};
type QuantNode = {
  id: string;
  productId: string;
  quantity: number;
  lotId: string | null;
  location: { id: string; usage: string } | null;
};

// The typed text is kept as typed, so "0." or "1," can still be completed.
const parseCounted = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));

  return text.trim().length > 0 && Number.isFinite(value) ? value : null;
};

// The product's stock rows in internal locations, each with a count to
// type; a changed count is applied when Apply is pressed.
const UpdateQuantity = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const { id: recordId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());
  const objectMetadata = useSelectedObjectMetadata();
  const { busy, error, setError, call } = usePopUpCall(t('The quantities could not be updated.'));
  const [variants, setVariants] = useState<Variant[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [defaultLocationId, setDefaultLocationId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useRunOnce(() => {
    const load = async () => {
      const variantFilter =
        objectMetadata?.nameSingular === 'productTemplate'
          ? { productTmplId: { eq: recordId }, active: { eq: true } }
          : { id: { eq: recordId } };
      const variantData = await queryAsUser<{ productProducts: { edges: { node: Variant }[] } }>(
        `query UpdateQuantityVariants($filter: ProductProductFilterInput) {
          productProducts(filter: $filter, first: 200) { edges { node { id name productTmpl { tracking } } } }
        }`,
        { filter: variantFilter },
      );
      const loadedVariants = variantData.productProducts.edges.map(({ node }) => node);
      if (loadedVariants.length === 0) {
        setVariants([]);
        return;
      }
      const data = await queryAsUser<{
        stockQuants: { edges: { node: QuantNode }[] };
        stockLocations: { edges: { node: LocationOption }[] };
        stockWarehouses: { edges: { node: { lotStockId: string | null } }[] };
        stockLots: { edges: { node: LotOption }[] };
      }>(
        `query UpdateQuantityRows($productIds: [UUID!]) {
          stockQuants(filter: { productId: { in: $productIds } }, first: 200) {
            edges { node { id productId quantity lotId location { id usage } } }
          }
          stockLots(filter: { productId: { in: $productIds } }, orderBy: [{ name: AscNullsLast }], first: 200) {
            edges { node { id name productId } }
          }
          stockLocations(filter: { usage: { eq: INTERNAL }, active: { eq: true } }, orderBy: [{ completeName: AscNullsLast }], first: 200) {
            edges { node { id completeName } }
          }
          stockWarehouses(orderBy: [{ sequence: AscNullsLast }, { createdAt: AscNullsLast }], first: 1) {
            edges { node { lotStockId } }
          }
        }`,
        { productIds: loadedVariants.map((variant) => variant.id) },
      );

      setVariants(loadedVariants);
      setLocations(data.stockLocations.edges.map(({ node }) => node));
      setLots(data.stockLots.edges.map(({ node }) => node));
      setDefaultLocationId(data.stockWarehouses.edges[0]?.node.lotStockId ?? '');
      setRows(
        data.stockQuants.edges
          .map(({ node }) => node)
          .filter((node) => node.location?.usage === LOCATION_USAGE.INTERNAL)
          .map((node) => ({
            key: node.id,
            quantId: node.id,
            productId: node.productId,
            locationId: node.location?.id ?? '',
            lotId: node.lotId,
            onHand: node.quantity,
            counted: String(node.quantity),
            edited: false,
          })),
      );
    };

    if (recordId !== null) {
      load().catch(() => setError(t('The stock of this product could not be read.')));
    }
  });

  const updateRow = (key: string, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        key: `new-${current.length}`,
        quantId: null,
        productId: variants[0]?.id ?? '',
        locationId: defaultLocationId,
        lotId: null,
        onHand: 0,
        counted: '0',
        edited: true,
      },
    ]);

  const apply = async () => {
    const changed = rows.flatMap((row) => {
      const counted = parseCounted(row.counted);

      return !row.edited || row.productId === '' || row.locationId === '' || counted === null
        ? []
        : [
            {
              quantId: row.quantId,
              productId: row.productId,
              locationId: row.locationId,
              lotId: row.lotId,
              onHand: row.onHand,
              counted,
            },
          ];
    });

    if (changed.length === 0) {
      closePopUp();
      return;
    }
    const result = await call(UPDATE_QUANTITY_ROUTE_PATH, { rows: changed });

    if (result !== null) {
      await finishWith(t('Quantities updated.'));
    }
  };

  const locationName = (locationId: string) =>
    locations.find((location) => location.id === locationId)?.completeName ?? '';
  const isTracked = (productId: string) => {
    const tracking = variants.find((variant) => variant.id === productId)?.productTmpl?.tracking;

    return tracking !== undefined && tracking !== null && tracking !== PRODUCT_TRACKING.NONE;
  };

  if (recordId === null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Update quantity</Trans>
      </div>
      {rows.map((row) => (
        <div key={row.key} style={styles.row}>
          {row.quantId === null && variants.length > 1 ? (
            <select
              style={styles.select}
              title={t('Product')}
              value={row.productId}
              onChange={(event) => updateRow(row.key, { productId: event.target.value, lotId: null })}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name ?? ''}
                </option>
              ))}
            </select>
          ) : (
            <span>{variants.find((variant) => variant.id === row.productId)?.name ?? ''}</span>
          )}
          {row.quantId === null ? (
            <select
              style={styles.select}
              title={t('Location')}
              value={row.locationId}
              onChange={(event) => updateRow(row.key, { locationId: event.target.value })}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.completeName ?? ''}
                </option>
              ))}
            </select>
          ) : (
            <span>{locationName(row.locationId)}</span>
          )}
          {row.quantId === null && isTracked(row.productId) ? (
            <select
              style={styles.select}
              title={t('Lot/Serial Number')}
              value={row.lotId ?? ''}
              onChange={(event) => updateRow(row.key, { lotId: event.target.value === '' ? null : event.target.value })}
            >
              <option value="">{t('No lot')}</option>
              {lots
                .filter((lot) => lot.productId === row.productId)
                .map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name ?? ''}
                  </option>
                ))}
            </select>
          ) : row.lotId !== null ? (
            <span>{lots.find((lot) => lot.id === row.lotId)?.name ?? ''}</span>
          ) : null}
          <span>{t('On hand: {onHand}', { onHand: row.onHand })}</span>
          <Input value={row.counted} onValueChange={(value: string) => updateRow(row.key, { counted: value, edited: true })} />
        </div>
      ))}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy || variants.length === 0} onClick={addRow}>
          {t('Add a line')}
        </Button>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void apply()}>
          {t('Apply')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-product-update-quantity',
  description: "Lists the product's stock in internal locations and applies changed counts at once.",
  component: UpdateQuantity,
});
