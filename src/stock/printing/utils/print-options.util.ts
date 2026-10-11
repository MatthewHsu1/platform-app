import { type PrintOptionsParser } from 'src/stock/printing/types/print-options-parser.type';

type PrintOptionKind = 'string' | 'number' | 'boolean' | readonly string[];

// Options travel inside the stored print pass: they stay small.
export const PRINT_OPTIONS_MAX_LENGTH = 2000;
const TEXT_MAX_LENGTH = 200;

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
  }
};

// Only the declared keys, each of its declared type or one of its choices. A record id is never
// an option: records reach a printable through the ids checked as the person.
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
