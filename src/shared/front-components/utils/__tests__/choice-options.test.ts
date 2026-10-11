import { describe, expect, it } from 'vitest';

import { optionsShowing } from 'src/shared/front-components/utils/choice-options.util';

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'URGENT', label: 'Urgent' },
];

describe('optionsShowing', () => {
  it('shows the options as they are when the value is one of them', () => {
    expect(optionsShowing('URGENT', PRIORITIES)).toEqual(PRIORITIES);
  });

  it('shows an empty choice first for a value that is none of the options, never the first option', () => {
    expect(optionsShowing('NORMAL,URGENT', PRIORITIES)).toEqual([{ value: 'NORMAL,URGENT', label: '' }, ...PRIORITIES]);
  });
});
