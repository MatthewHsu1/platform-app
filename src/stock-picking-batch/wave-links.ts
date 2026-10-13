import { destroyLinksOf } from 'src/shared/triggers/cascade-restore';
import { type Records } from 'src/shared/triggers/records';
import { waveCategoryLinks, waveLocationLinks } from 'src/stock-picking-batch/stock-picking-batch-records';

const destroyWaveLinks = async (links: Records[], field: string, removedIds: string[]) => {
  for (const link of links) {
    await destroyLinksOf(link, field, removedIds);
  }
};

// A deleted operation type, category or location takes its wave links with it
// for good. The callers pass only the ids still deleted once every put-back of
// that delete has run, so a delete that was refused keeps its links.
export const destroyWaveLinksOfPickingTypes = (removedIds: string[]) =>
  destroyWaveLinks([waveCategoryLinks, waveLocationLinks], 'stockPickingTypeId', removedIds);

export const destroyWaveLinksOfCategories = (removedIds: string[]) =>
  destroyWaveLinks([waveCategoryLinks], 'productCategoryId', removedIds);

export const destroyWaveLinksOfLocations = (removedIds: string[]) =>
  destroyWaveLinks([waveLocationLinks], 'stockLocationId', removedIds);
