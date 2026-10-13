import { describe, expect, it } from 'vitest';

import { guessDateOrder, parseLotDate } from 'src/stock/utils/parse-lot-date.util';
import { splitLotText } from 'src/stock/utils/split-lot-text.util';

const day = (iso: string) => `${iso}T00:00:00.000Z`;

const expirationDates = (lines: { expirationDate: string | null }[]) =>
  lines.map((line) => line.expirationDate);

describe('splitLotText', () => {
  it('reads a quantity column, 1 when there is none', () => {
    expect(
      splitLotText({
        text: 'aze;2\nqsd;4\nwxc',
        useExpirationDate: false,
        dateOrder: 'MONTH_FIRST',
        today: new Date('2025-01-01'),
      }),
    ).toEqual([
      { lotName: 'aze', quantity: 2, expirationDate: null },
      { lotName: 'qsd', quantity: 4, expirationDate: null },
      { lotName: 'wxc', quantity: 1, expirationDate: null },
    ]);
  });

  it('reads dates in the user order: day first, then month first', () => {
    const text = 'ln01;03/05/25\nln02;06/05/25\nln03;03/06/25\nln04;06/06/25\nln05;03/07/25';
    const today = new Date('2025-01-01');

    expect(
      expirationDates(
        splitLotText({ text, useExpirationDate: true, dateOrder: 'DAY_FIRST', today }),
      ),
    ).toEqual([
      day('2025-05-03'),
      day('2025-05-06'),
      day('2025-06-03'),
      day('2025-06-06'),
      day('2025-07-03'),
    ]);
    expect(
      expirationDates(
        splitLotText({ text, useExpirationDate: true, dateOrder: 'MONTH_FIRST', today }),
      ),
    ).toEqual([
      day('2025-03-05'),
      day('2025-06-05'),
      day('2025-03-06'),
      day('2025-06-06'),
      day('2025-03-07'),
    ]);
  });

  it('ignores dates for a product without expiry dates', () => {
    const lines = splitLotText({
      text: 'ln01;03/05/25\nln02;06/05/25',
      useExpirationDate: false,
      dateOrder: 'DAY_FIRST',
      today: new Date('2025-01-01'),
    });

    expect(lines).toEqual([
      { lotName: 'ln01', quantity: 1, expirationDate: null },
      { lotName: 'ln02', quantity: 1, expirationDate: null },
    ]);
  });

  it('follows the order the first pasted date shows when it is clear', () => {
    const today = new Date('2025-06-01');
    const dayFirst = 'ln01;30/05/25\nln02;06/05/25\nln03;01/06/25\nln04;06/06/25\nln05;01/07/25';
    const yearFirst = 'ln01;89/05/04\nln02;10/05/06\nln03;12/06/15\nln04;30/06/06\nln05;04/07/08';

    expect(
      expirationDates(
        splitLotText({ text: dayFirst, useExpirationDate: true, dateOrder: 'MONTH_FIRST', today }),
      ),
    ).toEqual([
      day('2025-05-30'),
      day('2025-05-06'),
      day('2025-06-01'),
      day('2025-06-06'),
      day('2025-07-01'),
    ]);
    expect(
      expirationDates(
        splitLotText({ text: yearFirst, useExpirationDate: true, dateOrder: 'DAY_FIRST', today }),
      ),
    ).toEqual([
      day('1989-05-04'),
      day('2010-05-06'),
      day('2012-06-15'),
      day('2030-06-06'),
      day('2004-07-08'),
    ]);
  });

  it('reads month names', () => {
    const lines = splitLotText({
      text: 'ln01;01 march 2077\nln02;11 april 2077\nln03;10 december 2077',
      useExpirationDate: true,
      dateOrder: 'MONTH_FIRST',
      today: new Date('2025-01-01'),
    });

    expect(expirationDates(lines)).toEqual([
      day('2077-03-01'),
      day('2077-04-11'),
      day('2077-12-10'),
    ]);
  });

  it('reads a quantity and a year-first date on the same row', () => {
    const lines = splitLotText({
      text: 'lot1;10;2025-12-31\nlot2;7\nlot3;3;1970-1-1',
      useExpirationDate: true,
      dateOrder: 'MONTH_FIRST',
      today: new Date('2025-09-13'),
    });

    expect(lines).toEqual([
      { lotName: 'lot1', quantity: 10, expirationDate: day('2025-12-31') },
      { lotName: 'lot2', quantity: 7, expirationDate: null },
      { lotName: 'lot3', quantity: 3, expirationDate: day('1970-01-01') },
    ]);
  });

  it('keeps the whole row as the name when a column is neither a number nor a date', () => {
    const lines = splitLotText({
      text: 'ln01\t31/12\nln02\t1989-04\nln03\t01\nln04\t1989\nln05\t1989.04\nln06\t1989+04\nln07\tdacember\nln08\tdecember',
      useExpirationDate: true,
      dateOrder: 'MONTH_FIRST',
      today: new Date('2023-04-17'),
    });

    expect(lines).toEqual([
      { lotName: 'ln01', quantity: 1, expirationDate: day('2023-12-31') },
      { lotName: 'ln02', quantity: 1, expirationDate: day('1989-04-17') },
      { lotName: 'ln03', quantity: 1, expirationDate: null },
      { lotName: 'ln04', quantity: 1989, expirationDate: null },
      { lotName: 'ln05', quantity: 1989.04, expirationDate: null },
      { lotName: 'ln06\t1989+04', quantity: 1, expirationDate: null },
      { lotName: 'ln07\tdacember', quantity: 1, expirationDate: null },
      { lotName: 'ln08', quantity: 1, expirationDate: day('2023-12-17') },
    ]);
  });

  it('reads a single pasted row with columns in either order', () => {
    for (const text of ['lot-001;20;4 Aug 2048', 'lot-001\t04/08/2048\t20']) {
      expect(
        splitLotText({
          text,
          useExpirationDate: true,
          dateOrder: 'DAY_FIRST',
          today: new Date('2025-01-01'),
        }),
      ).toEqual([{ lotName: 'lot-001', quantity: 20, expirationDate: day('2048-08-04') }]);
    }
  });
});

describe('parseLotDate', () => {
  it('refuses a day that does not exist', () => {
    expect(parseLotDate('31/02/2025', 'DAY_FIRST', new Date('2025-01-01'))).toBeNull();
  });

  it('takes the last day of the month when today is past it and the day is missing', () => {
    expect(parseLotDate('february', 'MONTH_FIRST', new Date('2025-01-31'))).toBe(
      day('2025-02-28'),
    );
    expect(parseLotDate('Sept 2025', 'MONTH_FIRST', new Date('2025-01-31'))).toBe(
      day('2025-09-30'),
    );
  });

  it('reads the second number as the day when it cannot be a month', () => {
    expect(parseLotDate('03/25/2025', 'DAY_FIRST', new Date('2025-01-01'))).toBe(
      day('2025-03-25'),
    );
    expect(parseLotDate('25/12/2025', 'MONTH_FIRST', new Date('2025-01-01'))).toBe(
      day('2025-12-25'),
    );
  });

  it('reads a four-digit first number as the year whatever the user order', () => {
    expect(parseLotDate('2025-12-31', 'DAY_FIRST', new Date('2025-01-01'))).toBe(
      day('2025-12-31'),
    );
  });

  it('reads dates split by dots or commas', () => {
    expect(parseLotDate('31.12.2025', 'MONTH_FIRST', new Date('2025-01-01'))).toBe(
      day('2025-12-31'),
    );
    expect(parseLotDate('Aug 4, 2048', 'MONTH_FIRST', new Date('2025-01-01'))).toBe(
      day('2048-08-04'),
    );
  });

  it('puts a two-digit year within 50 years of today', () => {
    const today = new Date('2025-01-01');

    expect(parseLotDate('1/1/75', 'MONTH_FIRST', today)).toBe(day('1975-01-01'));
    expect(parseLotDate('1/1/74', 'MONTH_FIRST', today)).toBe(day('2074-01-01'));
  });

  it('reads an ambiguous date year first for a year-first user', () => {
    expect(parseLotDate('03/05/25', 'YEAR_FIRST', new Date('2025-01-01'))).toBe(
      day('2003-05-25'),
    );
  });

  it('knows a month by its full or short English name only', () => {
    expect(parseLotDate('dece', 'MONTH_FIRST', new Date('2025-01-01'))).toBeNull();
  });
});

describe('guessDateOrder', () => {
  it('decides from the first date that shows its order', () => {
    expect(guessDateOrder(['10', '89/05/04'], 'DAY_FIRST')).toBe('YEAR_FIRST');
    expect(guessDateOrder(['30/05/25'], 'MONTH_FIRST')).toBe('DAY_FIRST');
    expect(guessDateOrder(['03/05/25'], 'DAY_FIRST')).toBe('DAY_FIRST');
  });

  it('stays undecided for month-first users and for a month written first', () => {
    expect(guessDateOrder(['03/05/25'], 'MONTH_FIRST')).toBeNull();
    expect(guessDateOrder(['Aug 4 2048'], 'DAY_FIRST')).toBeNull();
  });
});
