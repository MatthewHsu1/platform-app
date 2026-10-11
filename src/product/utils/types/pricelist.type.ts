import { type PricelistRule } from 'src/product/utils/types/pricelist-rule.type';

export type Pricelist = { id: string; name: string; currencyCode: string; rules: PricelistRule[] };
