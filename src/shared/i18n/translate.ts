import { CATALOGS } from 'src/shared/i18n/catalogs';
import { type Catalog } from 'src/shared/i18n/types/catalog.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

const fill = (text: string, values: TranslationValues) =>
  text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));

export const translateWith =
  (catalogs: Record<string, Catalog>) =>
  (locale: string | null, message: string, values: TranslationValues = {}) => {
    const entry = locale === null ? undefined : catalogs[locale]?.[message];

    return fill(typeof entry === 'string' && entry.length > 0 ? entry : message, values);
  };

export const translate = translateWith(CATALOGS);
