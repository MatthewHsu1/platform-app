import { type ScrapChoice } from 'src/stock/scrap/types/scrap-choice.type';

// What the Scrap pop-up of a transfer offers, and the locations it starts with.
export type ScrapChoices = {
  products: (ScrapChoice & { units: ScrapChoice[] })[];
  locations: ScrapChoice[];
  scrapLocations: ScrapChoice[];
  owners: ScrapChoice[];
  reasonTags: ScrapChoice[];
  defaults: { locationId: string | null; scrapLocationId: string | null };
};
