import { type PutawayLine } from 'src/stock/putaway/types/putaway-line.type';
import { type PutawayLocation } from 'src/stock/putaway/types/putaway-location.type';
import { type PutawayQuant } from 'src/stock/putaway/types/putaway-quant.type';
import { type PutawayRule } from 'src/stock/putaway/types/putaway-rule.type';
import { type StorageCategory } from 'src/stock/putaway/types/storage-category.type';

export type PutawayInput = {
  destinationId: string;
  productId: string;
  // Every product put away together (the product included); a category rule
  // applies only when all of them share one category.
  productIds: string[];
  // The shared category first, then its ancestors; empty when there is none.
  categoryChain: string[];
  // In the product's unit.
  quantity: number;
  package: { id: string; packageTypeId: string | null } | null;
  packagingPackageTypeId: string | null;
  extraQuantities: Map<string, number>;
  // Null: the destination and the active internal locations below it.
  candidateLocationIds: string[] | null;
  // The destination's active putaway rules, by priority then product.
  rules: PutawayRule[];
  locations: Map<string, PutawayLocation>;
  storageCategories: Map<string, StorageCategory>;
  quants: PutawayQuant[];
  openLines: PutawayLine[];
  excludedLineIds: Set<string>;
  productWeights: Map<string, number>;
  // Per last-used rule: where the latest done line of the product under its store-to location went.
  lastUsedLocationIds: Map<string, string | null>;
};
