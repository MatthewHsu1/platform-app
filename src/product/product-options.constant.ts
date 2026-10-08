// Select values of productTemplate that code compares against, so they are
// fixed in the app (the product type); labels may change.
export const PRODUCT_TYPE = {
  CONSU: 'CONSU',
  SERVICE: 'SERVICE',
  COMBO: 'COMBO',
} as const;

// When a value makes a variant.
export const CREATE_VARIANT = {
  ALWAYS: 'ALWAYS',
  DYNAMIC: 'DYNAMIC',
  NO_VARIANT: 'NO_VARIANT',
} as const;

export const DISPLAY_TYPE = {
  RADIO: 'RADIO',
  PILLS: 'PILLS',
  SELECT: 'SELECT',
  COLOR: 'COLOR',
  MULTI: 'MULTI',
  IMAGE: 'IMAGE',
} as const;

// What a pricelist rule applies to, what it is based on, and how it computes the price.
export const APPLIED_ON = {
  GLOBAL: 'GLOBAL',
  PRODUCT_CATEGORY: 'PRODUCT_CATEGORY',
  PRODUCT: 'PRODUCT',
  PRODUCT_VARIANT: 'PRODUCT_VARIANT',
} as const;

export const PRICELIST_BASE = {
  LIST_PRICE: 'LIST_PRICE',
  STANDARD_PRICE: 'STANDARD_PRICE',
  PRICELIST: 'PRICELIST',
} as const;

export const COMPUTE_PRICE = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
  FORMULA: 'FORMULA',
} as const;

export type AppliedOn = (typeof APPLIED_ON)[keyof typeof APPLIED_ON];
export type PricelistBase = (typeof PRICELIST_BASE)[keyof typeof PRICELIST_BASE];
export type ComputePrice = (typeof COMPUTE_PRICE)[keyof typeof COMPUTE_PRICE];
