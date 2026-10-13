import { EMAIL_STATE } from 'src/crm/crm-options.constant';
import { type EmailsValue } from 'src/crm/lead/types/emails-value.type';

type NamedEmail = { name: string; email: string };

// Splits on commas that sit outside quotes and angle brackets.
const splitAddressList = (text: string) => {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let inAngle = false;

  for (const character of text) {
    if (character === '"' && !inAngle) {
      inQuotes = !inQuotes;
    } else if (character === '<' && !inQuotes) {
      inAngle = true;
    } else if (character === '>' && !inQuotes) {
      inAngle = false;
    }
    if (character === ',' && !inQuotes && !inAngle) {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  parts.push(current);

  return parts.map((part) => part.trim()).filter((part) => part !== '');
};

const unquote = (name: string) => name.trim().replace(/^"(.*)"$/s, '$1').replace(/\\(["\\])/g, '$1').trim();

const parseAddress = (part: string): NamedEmail => {
  const angle = part.match(/^(.*)<([^<>]*)>\s*$/s);

  if (angle !== null) {
    return { name: unquote(angle[1]), email: angle[2].trim() };
  }

  return { name: '', email: part.trim() };
};

// "Name email@x" without quotes: the parts without an @ form the name.
const splitOnSpaces = (pair: NamedEmail): NamedEmail => {
  if (pair.name !== '' || !pair.email.includes(' ')) {
    return pair;
  }
  const tokens = pair.email.split(/\s+/).filter((token) => token !== '');
  const found = tokens.filter((token) => token.includes('@')).pop();

  return found === undefined ? pair : { name: tokens.filter((token) => !token.includes('@')).join(' '), email: found };
};

const EMAIL_IN_TEXT = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}/g;

// Every address in an address list, with its display name. A pair counts only
// when its address holds an @.
export const splitEmails = (text: string | null): NamedEmail[] => {
  if (text === null || text.trim() === '') {
    return [];
  }
  let pairs = splitAddressList(text)
    .map(parseAddress)
    .filter((pair) => pair.email.includes('@'));

  // A list that yields "@domain" addresses is read again for plain addresses.
  if (pairs.some((pair) => pair.email.startsWith('@'))) {
    const plain = (text.match(EMAIL_IN_TEXT) ?? []).filter((email) => !email.startsWith('@'));

    if (plain.length > 0) {
      pairs = plain.map((email) => ({ name: '', email }));
    }
  }

  return pairs.map(splitOnSpaces);
};

const isAscii = (text: string) => [...text].every((character) => character.charCodeAt(0) < 128);

// The local part is lower-cased only when it is plain ASCII; the domain always.
const normaliseAddress = (email: string) => {
  const at = email.lastIndexOf('@');
  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1);

  return `${isAscii(localPart) ? localPart.toLowerCase() : localPart}@${domain.toLowerCase()}`;
};

// One address, normalised; two or more, or none, give no result.
export const normaliseEmail = (text: string | null) => {
  const pairs = splitEmails(text);

  return pairs.length === 1 ? normaliseAddress(pairs[0].email) : null;
};

export const emailDisplayName = (text: string | null) => {
  const pairs = splitEmails(text);

  return pairs.length === 1 && pairs[0].name !== '' ? pairs[0].name : null;
};

// A usable address has something before and after the @.
const isUsableAddress = (email: string) => {
  const at = email.lastIndexOf('@');

  return at > 0 && at < email.length - 1;
};

// Every address inside a stored value counts, as when a list was typed into one field.
const usableAddressesOf = (value: string) =>
  splitEmails(value)
    .map((pair) => normaliseAddress(pair.email))
    .filter(isUsableAddress);

// Correct when any of the lead's addresses is usable, empty when it has none.
export const emailState = (emails: EmailsValue | null) => {
  const addresses = [emails?.primaryEmail ?? '', ...(emails?.additionalEmails ?? [])].filter(
    (address) => address.trim() !== '',
  );

  if (addresses.length === 0) {
    return null;
  }

  return addresses.some((address) => usableAddressesOf(address).length > 0) ? EMAIL_STATE.CORRECT : EMAIL_STATE.INCORRECT;
};
