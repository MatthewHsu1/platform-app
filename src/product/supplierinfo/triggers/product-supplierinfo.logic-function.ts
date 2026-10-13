import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productSupplierinfos } from 'src/product/supplierinfo/supplierinfo-records';
import { PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { planSupplierinfo } from 'src/product/utils/plan-supplierinfo.util';
import { productProducts, productTemplates } from 'src/product/variant/product-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type SupplierinfoEventRecord = {
  id: string;
  updatedBy?: { source?: string | null } | null;
};

type StoredSupplierinfo = {
  id: string;
  name: string | null;
  productUomId: string | null;
  productTmplId: string | null;
  productId: string | null;
  partner: { name: string | null } | null;
};

const SELECTION = 'id name productUomId productTmplId productId partner { name }';

const settleSupplierinfo = async (recordId: string) => {
  const [stored] = await productSupplierinfos.find<StoredSupplierinfo>({ id: { eq: recordId } }, SELECTION);

  if (stored === undefined) {
    return;
  }
  const [variant] =
    stored.productId === null
      ? []
      : await productProducts.find<{ name: string | null; productTmplId: string | null }>(
          { id: { eq: stored.productId } },
          'name productTmplId',
        );
  const templateId = variant?.productTmplId ?? stored.productTmplId;
  const [template] =
    templateId === null
      ? []
      : await productTemplates.find<{ name: string | null; uomId: string | null }>(
          { id: { eq: templateId } },
          'name uomId',
        );
  const plan = planSupplierinfo({
    stored: {
      name: stored.name,
      productUomId: stored.productUomId,
      productTmplId: stored.productTmplId,
      productId: stored.productId,
    },
    templateIdOfProduct: variant?.productTmplId ?? null,
    templateUomId: template?.uomId ?? null,
    vendorName: stored.partner?.name ?? null,
    productName: variant?.name ?? template?.name ?? null,
  });

  await productSupplierinfos.update(recordId, plan);
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<SupplierinfoEventRecord>>) => {
  const { operation, events } = readEvents<SupplierinfoEventRecord>(payload);

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }
  const errors = errorCollector();

  for (const event of events) {
    const after = 'after' in event.properties ? event.properties.after : undefined;

    if (after === undefined || isApplicationWrite(after)) {
      continue;
    }
    await errors.run(event.recordId, () => settleSupplierinfo(event.recordId));
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_PRICING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productSupplierinfo,
  name: 'platform-product-supplierinfo',
  description: "Fills a vendor price's product and unit from its variant and names it.",
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productSupplierinfo.*', batchMode: true },
});
