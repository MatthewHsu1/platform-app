import EN from '~/locales/en.json';
import { type Catalog } from 'src/shared/i18n/types/catalog.type';

// English only during the build; the other languages are added here after the
// owner's review.
export const CATALOGS: Record<string, Catalog> = { en: EN };
