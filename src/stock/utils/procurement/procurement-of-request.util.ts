import { readText } from 'src/shared/utils/read-text.util';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';
import { type PartnerRef } from 'src/stock/utils/procurement/types/partner-ref.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

const texts = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

// A request that names a warehouse key with no value searches rules of no
// warehouse in particular; one without the key lets the location chain give
// them. A final location has no procurement value: the rules give the moves
// their destinations.
export const procurementOfRequest = (request: ProcurementRequest, partners: Map<string, PartnerRef>): Procurement => {
  const partnerId = readText(request.values.partner);
  const datePlanned = readText(request.values.datePlanned);

  return {
    productId: request.productId,
    productQty: request.productQty,
    productUomId: request.productUomId,
    locationId: request.locationId,
    name: request.name,
    origin: request.origin.length > 0 ? request.origin : null,
    values: {
      ...('warehouse' in request.values ? { warehouseId: readText(request.values.warehouse) } : {}),
      ...(datePlanned === null ? {} : { datePlanned }),
      referenceIds: texts(request.values.references),
      partner: partnerId === null ? null : (partners.get(partnerId) ?? null),
    },
  };
};

export const requestPartnerIds = (requests: ProcurementRequest[]) => [
  ...new Set(requests.flatMap((request) => readText(request.values.partner) ?? [])),
];
