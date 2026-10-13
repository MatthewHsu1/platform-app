// Stored in the mix table and hashed into mixed role ids: never rename a key after release.
export const BLOCK_KEYS = {
  employee: 'employee',
  inventoryUser: 'inventory.user',
  inventoryAdministrator: 'inventory.administrator',
  productsCreate: 'products.create',
  salesOwn: 'sales.own',
  salesAll: 'sales.all',
  salesAdministrator: 'sales.administrator',
  workCasesOwn: 'workCases.own',
  workCasesAll: 'workCases.all',
  workCasesAdministrator: 'workCases.administrator',
} as const;
