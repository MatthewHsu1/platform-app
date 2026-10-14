import { stockReferenceFsmOrderRels } from 'src/fieldservice-stock/fieldservice-stock-records';
import { ORDER_DELETE_RULES } from 'src/fieldservice/order/order-delete-rules';
import { stockMoves, stockPickings } from 'src/stock/stock-records';

// A deleted service order leaves the transfers and moves that name it and loses its stock reference links.
ORDER_DELETE_RULES.references.push({ of: stockPickings, field: 'fsmOrderId' }, { of: stockMoves, field: 'fsmOrderId' });
ORDER_DELETE_RULES.links.push({ of: stockReferenceFsmOrderRels, field: 'orderId' });
