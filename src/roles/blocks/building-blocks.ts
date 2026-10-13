import { EMPLOYEE_BLOCK } from 'src/roles/blocks/employee.block';
import { INVENTORY_ADMINISTRATOR_BLOCK, INVENTORY_USER_BLOCK, PRODUCTS_CREATE_BLOCK } from 'src/roles/blocks/inventory.blocks';
import { SALES_ADMINISTRATOR_BLOCK, SALES_ALL_BLOCK, SALES_OWN_BLOCK } from 'src/roles/blocks/sales.blocks';
import { WORK_CASES_ADMINISTRATOR_BLOCK, WORK_CASES_ALL_BLOCK, WORK_CASES_OWN_BLOCK } from 'src/roles/blocks/work-cases.blocks';
import { type BuildingBlock } from 'src/roles/types/building-block.type';

// In the order a mixed role's label names them.
export const BUILDING_BLOCKS: BuildingBlock[] = [
  EMPLOYEE_BLOCK,
  INVENTORY_USER_BLOCK,
  INVENTORY_ADMINISTRATOR_BLOCK,
  PRODUCTS_CREATE_BLOCK,
  SALES_OWN_BLOCK,
  SALES_ALL_BLOCK,
  SALES_ADMINISTRATOR_BLOCK,
  WORK_CASES_OWN_BLOCK,
  WORK_CASES_ALL_BLOCK,
  WORK_CASES_ADMINISTRATOR_BLOCK,
];
