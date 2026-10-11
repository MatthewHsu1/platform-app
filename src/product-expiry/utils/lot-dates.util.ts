import { type ExpiryTimes } from 'src/product-expiry/utils/types/expiry-times.type';
import { type LotDateFields } from 'src/product-expiry/utils/types/lot-date-fields.type';
import { type LotDatesEvent } from 'src/product-expiry/utils/types/lot-dates-event.type';

type DerivedDate = 'useDate' | 'removalDate' | 'alertDate';

const DAY_MS = 86_400_000;
const DERIVED: { field: DerivedDate; days: (product: ExpiryTimes) => number }[] = [
  { field: 'useDate', days: (product) => product.useTime },
  { field: 'removalDate', days: (product) => product.removalTime },
  { field: 'alertDate', days: (product) => product.alertTime },
];
const NO_DATES: LotDateFields = { expirationDate: null, useDate: null, removalDate: null, alertDate: null };

export const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY_MS).toISOString();

// Twenty may write an instant another way than toISOString does.
export const sameDate = (left: string | null, right: string | null) =>
  left === right || (left !== null && right !== null && Date.parse(left) === Date.parse(right));

const changesOnly = (after: LotDateFields, next: LotDateFields): Partial<LotDateFields> =>
  Object.fromEntries(
    (Object.keys(next) as (keyof LotDateFields)[])
      .filter((field) => !sameDate(next[field], after[field]))
      .map((field) => [field, next[field]]),
  );

const rebuilt = (expirationDate: string, product: ExpiryTimes) =>
  Object.fromEntries(DERIVED.map(({ field, days }) => [field, addDays(expirationDate, -days(product))])) as Pick<
    LotDateFields,
    DerivedDate
  >;

const keepTyped = (next: LotDateFields, after: LotDateFields, typedFields: readonly (keyof LotDateFields)[]): LotDateFields => ({
  ...next,
  ...Object.fromEntries(typedFields.map((field) => [field, after[field]])),
});

// A new lot keeps every date typed on it and fills the rest; a changed product dates the lot again from now; a changed
// expiration date moves the other dates by the same amount, or rebuilds them when they were all empty or the
// expiration date was empty before. A product without expiry keeps no derived date once the lot is edited. On an edit,
// a date the user typed in the same save is kept as typed and the others are worked out around it.
export const planLotDates = ({
  event,
  product,
  before,
  after,
  typedFields = [],
  now,
}: {
  event: LotDatesEvent;
  product: ExpiryTimes | null;
  before: LotDateFields | null;
  after: LotDateFields;
  typedFields?: readonly (keyof LotDateFields)[];
  now: Date;
}): Partial<LotDateFields> => {
  const expiry = product?.useExpirationDate === true ? product : null;
  const fromNow = (days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();
  const settle = (next: LotDateFields) => changesOnly(after, keepTyped(next, after, typedFields));

  if (event === 'created') {
    const expirationDate = after.expirationDate ?? (expiry === null ? null : fromNow(expiry.expirationTime));
    const next: LotDateFields = { ...after, expirationDate };

    if (expiry !== null && expirationDate !== null) {
      for (const { field, days } of DERIVED) {
        next[field] = after[field] ?? addDays(expirationDate, -days(expiry));
      }
    }
    return changesOnly(after, next);
  }

  if (event === 'productChanged') {
    if (expiry === null) {
      return settle(NO_DATES);
    }
    const expirationDate = typedFields.includes('expirationDate') ? after.expirationDate : fromNow(expiry.expirationTime);

    return settle(expirationDate === null ? { ...after, expirationDate } : { expirationDate, ...rebuilt(expirationDate, expiry) });
  }

  if (expiry === null) {
    return settle({ ...after, useDate: null, removalDate: null, alertDate: null });
  }
  if (after.expirationDate === null) {
    return {};
  }
  const allEmpty = after.useDate === null && after.removalDate === null && after.alertDate === null;

  if (allEmpty || before === null || before.expirationDate === null) {
    return settle({ ...after, ...rebuilt(after.expirationDate, expiry) });
  }
  const delta = Date.parse(after.expirationDate) - Date.parse(before.expirationDate);
  const shifted = { ...after };

  for (const { field } of DERIVED) {
    const previous = before[field];

    shifted[field] = previous === null ? null : new Date(Date.parse(previous) + delta).toISOString();
  }
  return settle(shifted);
};

export const isLotExpired = (expirationDate: string | null, now: Date) =>
  expirationDate !== null && Date.parse(expirationDate) <= now.getTime();

// A lot's stock stops counting as free from the very moment of its removal date, not from the start of that day.
export const removalReached = (removalDate: string | null, now: Date) =>
  !!removalDate && Date.parse(removalDate) <= now.getTime();

// Whether a removal date change moves the lot across the given moment, so the quantities counted at it change.
export const removalCrossedNow = (before: string | null, after: string | null, now: Date) =>
  removalReached(before, now) !== removalReached(after, now);
