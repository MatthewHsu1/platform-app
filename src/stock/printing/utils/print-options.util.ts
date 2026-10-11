import { type PrintOptionsParser } from 'src/stock/printing/types/print-options-parser.type';

type PrintOptionKind = 'string' | 'number' | 'boolean' | 'idList' | readonly string[];

// Options travel inside the stored print pass: they stay small.
export const PRINT_OPTIONS_MAX_LENGTH = 2000;
const TEXT_MAX_LENGTH = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPrintOptionsSizeAllowed = (options: Record<string, unknown>) =>
  JSON.stringify(options).length <= PRINT_OPTIONS_MAX_LENGTH;

const fits = (kind: PrintOptionKind, value: unknown) => {
  if (typeof kind !== 'string') {
    return typeof value === 'string' && kind.includes(value);
  }
  switch (kind) {
    case 'string':
      return typeof value === 'string' && value.length <= TEXT_MAX_LENGTH;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'idList':
      return Array.isArray(value) && value.every((item) => typeof item === 'string' && UUID.test(item));
  }
};

// Only the declared keys, each of its declared type or one of its choices. An option that names
// records is kept only when the print route has checked the user may read them.
export const printOptionsParser =
  (declared: Record<string, PrintOptionKind>): PrintOptionsParser =>
  (options) => {
    const parsed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(options)) {
      if (!Object.prototype.hasOwnProperty.call(declared, key) || !fits(declared[key], value)) {
        return null;
      }
      parsed[key] = value;
    }

    return parsed;
  };

export const NO_PRINT_OPTIONS = printOptionsParser({});
