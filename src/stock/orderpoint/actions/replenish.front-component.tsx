import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { selectOneRecord } from 'src/shared/front-components/selection-check';
import { type ReplenishForm } from 'src/stock/orderpoint/types/replenish-form.type';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { toIsoDateTime, toLocalDateTime } from 'src/shared/front-components/utils/local-date-time.util';
import { readStockStyles } from 'src/stock/stock-theme';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

// The typed text is kept as typed, so "0." or "1," can still be completed.
const parseQuantity = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));

  return text.trim().length > 0 && Number.isFinite(value) ? value : null;
};

// Replenish on a variant or a product. Changing the variant or the warehouse
// reads the forecast again and the quantity that covers it; changing the
// route sets the scheduled date from the route's delays.
const Replenish = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const { id: recordId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());
  const fromProduct = useSelectedObjectMetadata()?.nameSingular === 'productTemplate';
  const { busy, error, call } = usePopUpCall(t('Could not replenish.'));
  const [form, setForm] = useState<ReplenishForm | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [uomId, setUomId] = useState('');
  const [datePlanned, setDatePlanned] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [routeId, setRouteId] = useState('');

  const product = (nextVariantId: string) =>
    fromProduct ? { productTemplateId: recordId, productId: nextVariantId || null } : { productId: recordId };

  const load = async (request: Record<string, unknown>, apply: (next: ReplenishForm) => void) => {
    const next = await call<ReplenishForm>(ORDERPOINT_ROUTE_PATHS.replenishDefaults, request);

    if (next !== null) {
      setForm(next);
      apply(next);
    }
  };

  useRunOnce(() => {
    if (recordId === null) {
      return;
    }
    void load(fromProduct ? { productTemplateId: recordId } : { productId: recordId }, (next) => {
      setVariantId(next.variantId ?? '');
      setQuantity(String(next.quantity));
      setUomId(next.uomId);
      setDatePlanned(toLocalDateTime(next.datePlanned));
      setWarehouseId(next.warehouseId ?? '');
      setRouteId(next.routeId ?? '');
    });
  });

  const pickVariant = (nextVariantId: string) =>
    void load(
      { ...product(nextVariantId), warehouseId: warehouseId || null, routeId: routeId || null },
      (next) => {
        setVariantId(next.variantId ?? '');
        setQuantity(String(next.quantity));
        if (!next.units.some((unit) => unit.id === uomId)) {
          setUomId(next.uomId);
        }
      },
    );

  const pickWarehouse = (nextWarehouseId: string) =>
    void load({ ...product(variantId), warehouseId: nextWarehouseId, routeId: routeId || null }, (next) => {
      setWarehouseId(next.warehouseId ?? '');
      setQuantity(String(next.quantity));
    });

  const pickRoute = (nextRouteId: string) =>
    void load({ ...product(variantId), warehouseId: warehouseId || null, routeId: nextRouteId || null }, (next) => {
      setRouteId(next.routeId ?? '');
      setDatePlanned(toLocalDateTime(next.datePlanned));
    });

  const confirm = async () => {
    const result = await call<{ message: string | null }>(ORDERPOINT_ROUTE_PATHS.replenish, {
      variantId,
      quantity: parseQuantity(quantity),
      uomId,
      warehouseId,
      routeId: routeId || null,
      datePlanned: toIsoDateTime(datePlanned),
    });

    if (result === null) {
      return;
    }
    if (result.message === null) {
      closePopUp();
      return;
    }
    await finishWith(result.message);
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
  if (form === null) {
    return <ClosablePanel message={busy ? t('Loading…') : null} error={error} busy={busy} closeLabel={t('Close')} />;
  }
  const productName = form.variants.find((variant) => variant.id === variantId)?.name ?? '';

  return (
    <PopupPanel title={t("Low on stock? Let's replenish.")}>
      {form.hasVariants && (
        <FieldRow label={t('Product')}>
          <ChoiceSelect
            value={variantId}
            disabled={busy}
            onChange={pickVariant}
            options={form.variants.map((variant) => ({ value: variant.id, label: variant.name }))}
          />
        </FieldRow>
      )}
      <div>
        {t('The forecasted quantity of {product} is {forecast} {unit}', {
          product: productName,
          forecast: form.forecast,
          unit: form.productUomName,
        })}
      </div>
      <FieldRow label={t('Quantity')}>
        <div style={styles.row}>
          <Input type="number" step="any" value={quantity} onValueChange={setQuantity} />
          <ChoiceSelect
            value={uomId}
            onChange={setUomId}
            options={form.units.map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </div>
      </FieldRow>
      <FieldRow label={t('Scheduled Date')}>
        <Input type="datetime-local" value={datePlanned} onValueChange={setDatePlanned} />
      </FieldRow>
      <FieldRow label={t('Warehouse')}>
        <ChoiceSelect
          value={warehouseId}
          disabled={busy}
          onChange={pickWarehouse}
          options={form.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
        />
      </FieldRow>
      <FieldRow label={t('Preferred Route')}>
        <ChoiceSelect
          value={routeId}
          disabled={busy}
          onChange={pickRoute}
          options={[{ value: '', label: t('None') }, ...form.routes.map((route) => ({ value: route.id, label: route.name }))]}
        />
      </FieldRow>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={busy || variantId === '' || warehouseId === ''}
          onClick={() => void confirm()}
        >
          {t('Confirm')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.replenish,
  name: 'stock-replenish',
  description: 'Orders more of a product into a warehouse through a chosen route.',
  component: Replenish,
});
