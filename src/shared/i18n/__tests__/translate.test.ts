import { describe, expect, it } from 'vitest';

import { translateWith } from 'src/shared/i18n/translate';

const translate = translateWith({
  en: {},
  'fr-FR': { 'Hi {name}': 'Bonjour {name}', 'Saved {count} cards': '' },
});

describe('translate', () => {
  it('fills placeholders in the English source when no catalog has the text', () => {
    expect(translate('en', 'The record {name} has been saved.', { name: 'REC/00002' })).toBe(
      'The record REC/00002 has been saved.',
    );
  });

  it('uses the translation of the user language and fills it', () => {
    expect(translate('fr-FR', 'Hi {name}', { name: 'Ann' })).toBe('Bonjour Ann');
  });

  it('falls back to the source for an empty translation, an unknown language or no language', () => {
    expect(translate('fr-FR', 'Saved {count} cards', { count: 3 })).toBe('Saved 3 cards');
    expect(translate('de-DE', 'Hi {name}', { name: 'Ann' })).toBe('Hi Ann');
    expect(translate(null, 'Hi {name}', { name: 'Ann' })).toBe('Hi Ann');
  });

  it('leaves a placeholder without a value as it is', () => {
    expect(translate('en', 'Hi {name}')).toBe('Hi {name}');
  });
});
