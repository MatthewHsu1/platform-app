import { splitEmails } from 'src/crm/lead/utils/email.util';

// The name of the first address ("Ann Lee" <ann@x.example> gives Ann Lee); a
// text with no address at all is taken as the name itself.
export const contactNameFromEmail = (text: string | null) => {
  if (text === null || text.trim().length === 0) {
    return null;
  }

  const [first] = splitEmails(text);

  if (first === undefined) {
    return text.trim();
  }

  return first.name.length === 0 ? null : first.name;
};
