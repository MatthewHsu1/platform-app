import { type SelectFieldColor } from 'src/shared/fields';

// Colour numbers 1 to 11 of the source data, as Twenty tag colour names.
// 0 means no colour and is stored as an empty field.
export const COLOR_INDEX_NAMES: Readonly<Record<number, SelectFieldColor>> = {
  1: 'red',
  2: 'orange',
  3: 'yellow',
  4: 'cyan',
  5: 'blue',
  6: 'bronze',
  7: 'turquoise',
  8: 'purple',
  9: 'ruby',
  10: 'green',
  11: 'gray',
};

const COLOR_NUMBERS = Object.keys(COLOR_INDEX_NAMES).map(Number);

// A new team or tag without a colour gets one of the eleven at random.
export const pickRandomColor = (random: () => number = Math.random): SelectFieldColor =>
  COLOR_INDEX_NAMES[COLOR_NUMBERS[Math.min(COLOR_NUMBERS.length - 1, Math.floor(random() * COLOR_NUMBERS.length))]];
