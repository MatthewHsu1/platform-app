import { fsmEquipmentFsmOrderRels, fsmEquipments } from 'src/fieldservice/fieldservice-records';
import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';

// A deleted equipment leaves its children and loses its order links for good.
export const EQUIPMENT_DELETE_RULES: DeleteRules = {
  references: [{ of: fsmEquipments, field: 'parentId' }],
  cascades: [],
  links: [{ of: fsmEquipmentFsmOrderRels, field: 'equipmentId' }],
};
