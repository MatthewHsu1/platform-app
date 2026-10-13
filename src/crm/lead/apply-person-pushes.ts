import { type LeadPersonPush } from 'src/crm/lead/types/lead-person-push.type';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { DUPLICATE_ENTRY_MESSAGE, errorCollector } from 'src/shared/triggers/retry-on-conflict';

const people = records('person', 'people');

export const PERSON_PUSH_MESSAGES = {
  emailTaken: "The contact's email was not changed: another contact already uses this address.",
} as const;

// A contact's email is unique in the workspace: when another contact holds
// the address the email stays as it was, the phone still goes through, and
// the lead gets a note. Two leads of one contact in one batch: the last wins.
export const applyPersonPushes = async (pushes: LeadPersonPush[]) => {
  const errors = errorCollector();
  const byPerson = new Map(pushes.map((entry) => [entry.push.personId, entry]));

  for (const { leadId, push, locale } of byPerson.values()) {
    await errors.run(`Contact ${push.personId}`, async () => {
      const phones = push.phone === undefined ? {} : { phones: push.phone };

      if (push.primaryEmail === undefined) {
        await people.update(push.personId, phones);
        return;
      }
      try {
        await people.update(push.personId, { emails: { primaryEmail: push.primaryEmail, additionalEmails: [] }, ...phones });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes(DUPLICATE_ENTRY_MESSAGE)) {
          throw error;
        }
        await people.update(push.personId, phones);
        await addNote({
          objectSingular: 'crmLead',
          recordId: leadId,
          title: 'Contact not updated',
          body: translate(locale, PERSON_PUSH_MESSAGES.emailTaken),
        });
      }
    });
  }

  errors.throwIfAny();
};
