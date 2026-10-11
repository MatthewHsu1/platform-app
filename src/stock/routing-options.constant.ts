// Select values of the routing objects that code compares against; labels may change.
export const RULE_ACTION = { PULL: 'PULL', PUSH: 'PUSH', PULL_PUSH: 'PULL_PUSH' } as const;

export const RULE_PROCURE_METHOD = {
  MAKE_TO_STOCK: 'MAKE_TO_STOCK',
  MAKE_TO_ORDER: 'MAKE_TO_ORDER',
  MTS_ELSE_MTO: 'MTS_ELSE_MTO',
} as const;

export const REMOVAL_METHOD = {
  FIFO: 'FIFO',
  LIFO: 'LIFO',
  CLOSEST: 'CLOSEST',
  LEAST_PACKAGES: 'LEAST_PACKAGES',
  FEFO: 'FEFO',
} as const;

export const RULE_AUTO = { MANUAL: 'MANUAL', TRANSPARENT: 'TRANSPARENT' } as const;

export const PUTAWAY_SUBLOCATION = { NO: 'NO', LAST_USED: 'LAST_USED', CLOSEST_LOCATION: 'CLOSEST_LOCATION' } as const;

export const STORAGE_ALLOW_NEW_PRODUCT = { EMPTY: 'EMPTY', SAME: 'SAME', MIXED: 'MIXED' } as const;

export const PACKAGE_USE = { DISPOSABLE: 'DISPOSABLE', REUSABLE: 'REUSABLE' } as const;

export const MTO_ROUTE_SEED_KEY = 'stock.route_warehouse0_mto';
