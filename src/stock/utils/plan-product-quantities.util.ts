import { expiredUnreserved, withExpiredUnreserved } from 'src/product-expiry/utils/expiry-quantities.util';
import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import { floatRound } from 'src/shared/utils/float-round.util';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';

export const OPEN_MOVE_STATES_FOR_FORECAST: MoveState[] = [
  MOVE_STATE.WAITING,
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.ASSIGNED,
  MOVE_STATE.PARTIALLY_AVAILABLE,
];

type ProductQuantities = {
  qtyAvailable: number;
  freeQty: number;
  incomingQty: number;
  outgoingQty: number;
  virtualAvailable: number;
};

type TemplateQuantities = Omit<ProductQuantities, 'freeQty'>;

type QuantityInput = {
  products: { id: string; templateId: string; productType: string }[];
  scopeLocationIds: Set<string>;
  quants: { productId: string; locationId: string; quantity: number; reservedQuantity: number; removalDate?: string | null }[];
  moves: {
    productId: string;
    state: MoveState;
    productQty: number | null;
    locationId: string | null;
    locationDestId: string | null;
    locationFinalId: string | null;
  }[];
  digits: number;
  now: Date;
};

const ZERO: ProductQuantities = { qtyAvailable: 0, freeQty: 0, incomingQty: 0, outgoingQty: 0, virtualAvailable: 0 };

// Stored values use the default scope: every location under an active
// warehouse's view location. An open move's destination is its final
// location when one is set. Stock past its removal date is still on hand, but
// neither free nor in the forecast.
export const planProductQuantities = ({ products, scopeLocationIds, quants, moves, digits, now }: QuantityInput) => {
  const round = (value: number) => floatRound(value, 10 ** -digits, 'HALF-UP') || 0;
  const inScope = (locationId: string | null) => locationId !== null && scopeLocationIds.has(locationId);
  const productResult = new Map<string, ProductQuantities>();
  const templateResult = new Map<string, TemplateQuantities>();

  for (const { id, templateId, productType } of products) {
    let quantities = ZERO;

    if (productType !== PRODUCT_TYPE.SERVICE) {
      const scopedQuants = quants.filter((quant) => quant.productId === id && inScope(quant.locationId));
      const onHand = scopedQuants.reduce((sum, quant) => sum + quant.quantity, 0);
      const reserved = scopedQuants.reduce((sum, quant) => sum + quant.reservedQuantity, 0);
      const openMoves = moves.filter(
        (move) => move.productId === id && OPEN_MOVE_STATES_FOR_FORECAST.includes(move.state),
      );
      let incoming = 0;
      let outgoing = 0;

      for (const move of openMoves) {
        const sourceIn = inScope(move.locationId);
        const destinationIn = inScope(move.locationFinalId ?? move.locationDestId);

        if (!sourceIn && destinationIn) {
          incoming += move.productQty ?? 0;
        } else if (sourceIn && !destinationIn) {
          outgoing += move.productQty ?? 0;
        }
      }

      const planned = withExpiredUnreserved(
        { freeQty: onHand - reserved, virtualAvailable: onHand + incoming - outgoing },
        expiredUnreserved(scopedQuants, now),
      );

      quantities = {
        qtyAvailable: round(onHand),
        freeQty: round(planned.freeQty),
        incomingQty: round(incoming),
        outgoingQty: round(outgoing),
        virtualAvailable: round(planned.virtualAvailable),
      };
    }

    productResult.set(id, quantities);
    const template = templateResult.get(templateId) ?? {
      qtyAvailable: 0,
      incomingQty: 0,
      outgoingQty: 0,
      virtualAvailable: 0,
    };
    templateResult.set(templateId, {
      qtyAvailable: round(template.qtyAvailable + quantities.qtyAvailable),
      incomingQty: round(template.incomingQty + quantities.incomingQty),
      outgoingQty: round(template.outgoingQty + quantities.outgoingQty),
      virtualAvailable: round(template.virtualAvailable + quantities.virtualAvailable),
    });
  }

  return { products: productResult, templates: templateResult };
};
