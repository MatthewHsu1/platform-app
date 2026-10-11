import { describe, expect, it } from 'vitest';

import { listColumns } from 'src/stock/views/list-columns';

const VIEW = '00000000-0000-4000-8000-000000000001';
const field = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

describe('listColumns', () => {
  it('shows the chosen columns first in their order, then every other field hidden', () => {
    const columns = listColumns(VIEW, [field(3), field(1)], [field(1), field(2), field(3), field(4)]);

    expect(columns.map(({ fieldMetadataUniversalIdentifier, position, isVisible }) => [fieldMetadataUniversalIdentifier, position, isVisible])).toEqual([
      [field(3), 0, true],
      [field(1), 1, true],
      [field(2), 2, false],
      [field(4), 3, false],
    ]);
  });

  it('lists a field once even when two field lists name it', () => {
    const columns = listColumns(VIEW, [field(1)], [field(1), field(2), field(2)]);

    expect(columns.map((column) => column.fieldMetadataUniversalIdentifier)).toEqual([field(1), field(2)]);
  });

  it('refuses more than ten visible columns', () => {
    const eleven = Array.from({ length: 11 }, (_, index) => field(index + 1));

    expect(() => listColumns(VIEW, eleven, eleven)).toThrow('at most 10 columns');
    expect(listColumns(VIEW, eleven.slice(0, 10), eleven).filter((column) => column.isVisible)).toHaveLength(10);
  });

  it('gives a column the same id on every build, and a different one in another view', () => {
    const [first] = listColumns(VIEW, [field(1)], []);
    const [again] = listColumns(VIEW, [field(1)], []);
    const [otherView] = listColumns('00000000-0000-4000-8000-000000000002', [field(1)], []);

    expect(again.universalIdentifier).toBe(first.universalIdentifier);
    expect(otherView.universalIdentifier).not.toBe(first.universalIdentifier);
  });
});
