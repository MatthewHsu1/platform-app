import { GraphqlInputError } from 'src/shared/twenty-graphql';

type Condition = Record<string, unknown>;

const compare = (left: unknown, right: unknown) =>
  typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));

const matchesCondition = (value: unknown, condition: Condition): boolean =>
  Object.entries(condition).every(([operator, expected]) => {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'neq':
        return value !== null && value !== undefined && value !== expected;
      case 'is':
        return expected === 'NULL' ? value === null || value === undefined : value !== null && value !== undefined;
      case 'in':
        return (expected as unknown[]).includes(value);
      case 'lt':
        return value !== null && value !== undefined && compare(value, expected) < 0;
      case 'lte':
        return value !== null && value !== undefined && compare(value, expected) <= 0;
      case 'gt':
        return value !== null && value !== undefined && compare(value, expected) > 0;
      case 'gte':
        return value !== null && value !== undefined && compare(value, expected) >= 0;
      default:
        throw new GraphqlInputError(`Find leads: Unknown operator ${operator}`);
    }
  });

export const matchesTwentyFilter = (filter: Record<string, unknown>, row: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([key, condition]) => {
    if (key === 'and') {
      return (condition as Record<string, unknown>[]).every((part) => matchesTwentyFilter(part, row));
    }
    if (key === 'or') {
      return (condition as Record<string, unknown>[]).some((part) => matchesTwentyFilter(part, row));
    }
    if (key === 'not') {
      return !matchesTwentyFilter(condition as Record<string, unknown>, row);
    }
    return matchesCondition(row[key], condition as Condition);
  });
