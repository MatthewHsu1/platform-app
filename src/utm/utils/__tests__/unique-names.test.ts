import { describe, expect, it } from 'vitest';

import { splitNameAndCount, uniqueNames } from 'src/utm/utils/unique-names.util';

describe('splitNameAndCount', () => {
  it('reads a trailing counter', () => {
    expect(splitNameAndCount('medium')).toEqual(['medium', 1]);
    expect(splitNameAndCount('medium [0]')).toEqual(['medium', 0]);
    expect(splitNameAndCount('medium [1]')).toEqual(['medium', 1]);
    expect(splitNameAndCount('Medium [1234]')).toEqual(['Medium', 1234]);
  });

  it('leaves text that is not a counter alone', () => {
    expect(splitNameAndCount('medium [x]')).toEqual(['medium [x]', 1]);
    expect(splitNameAndCount('medium [0')).toEqual(['medium [0', 1]);
  });
});

describe('uniqueNames', () => {
  it('numbers repeated names and keeps a free asked counter', () => {
    expect(uniqueNames(['test', 'test [3]', 'bob', 'test', 'test'], ['test'])).toEqual(['test [2]', 'test [3]', 'bob', 'test [4]', 'test [5]']);
  });

  it('treats a counter of 0 as no counter', () => {
    expect(uniqueNames(['UTM 1', 'UTM 2', 'UTM new', 'UTM new', 'UTM new [0]'], ['UTM new'])).toEqual([
      'UTM 1',
      'UTM 2',
      'UTM new [2]',
      'UTM new [3]',
      'UTM new [4]',
    ]);
  });

  it('fills the free counters in order', () => {
    expect(uniqueNames(['UTM new', 'UTM new', 'UTM new', 'UTM new'], ['UTM 1', 'UTM 2', 'UTM new [4]'])).toEqual([
      'UTM new',
      'UTM new [2]',
      'UTM new [3]',
      'UTM new [5]',
    ]);
  });

  it('does not count a name that only starts the same', () => {
    expect(uniqueNames(['UTM ne'], ['UTM new', 'UTM new [2]'])).toEqual(['UTM ne']);
    expect(uniqueNames(['UTM ne'], ['UTM ne', 'UTM new'])).toEqual(['UTM ne [2]']);
    expect(uniqueNames(['UTM ne'], ['UTM ne', 'UTM ne [2]'])).toEqual(['UTM ne [3]']);
  });

  it('accepts an asked counter when free and numbers the rest', () => {
    expect(uniqueNames(['BatchTest [2]', 'BatchTest [2]', 'BatchTest [2]', 'BatchTest [2]'], [])).toEqual([
      'BatchTest [2]',
      'BatchTest',
      'BatchTest [3]',
      'BatchTest [4]',
    ]);
    expect(uniqueNames(['NoDupBatch [2]', 'NoDupBatch [4]', 'NoDupBatch [6]', 'Margoulin'], [])).toEqual([
      'NoDupBatch [2]',
      'NoDupBatch [4]',
      'NoDupBatch [6]',
      'Margoulin',
    ]);
  });

  it('compares names with their exact case', () => {
    expect(uniqueNames(['Promo'], ['promo'])).toEqual(['Promo']);
  });

  it('counts an existing name with a broken counter as the plain name', () => {
    expect(uniqueNames(['Promo'], ['Promo [x]'])).toEqual(['Promo [2]']);
  });

  it('keeps an empty name empty', () => {
    expect(uniqueNames([null, ''], ['x'])).toEqual([null, null]);
  });
});
