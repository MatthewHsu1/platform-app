import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { fsmEquipmentFsmOrderRels, fsmOrderFsmPersonRels } from 'src/fieldservice/fieldservice-records';

// A deleted order loses its equipment and worker links for good.
export const ORDER_DELETE_RULES: DeleteRules = {
  references: [],
  cascades: [],
  links: [
    { of: fsmEquipmentFsmOrderRels, field: 'orderId' },
    { of: fsmOrderFsmPersonRels, field: 'orderId' },
  ],
};
