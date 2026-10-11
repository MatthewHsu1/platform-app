import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { type ExpiryLineNode } from 'src/product-expiry/types/expiry-line-node.type';
import { type ExpiryLine } from 'src/product-expiry/utils/types/expiry-line.type';

// Twenty drops a relation nested under a to-one relation unless that relation
// also selects deletedAt.
export const EXPIRY_LINE_SELECTION =
  'id pickingId lotId lotName removalDate lot { name expirationDate } product { deletedAt name productTmpl { name useExpirationDate } }';

// A line names the lot it has, else the lot name typed on it for a lot not made yet.
export const toExpiryLine = (node: ExpiryLineNode): ExpiryLine => ({
  id: node.id,
  pickingId: node.pickingId,
  productName: textOrNull(node.product?.name) ?? textOrNull(node.product?.productTmpl?.name) ?? '',
  lotId: node.lotId,
  lotName: textOrNull(node.lot?.name) ?? textOrNull(node.lotName),
  lotExpirationDate: node.lot?.expirationDate ?? null,
  removalDate: node.removalDate,
  useExpirationDate: node.product?.productTmpl?.useExpirationDate === true,
});
