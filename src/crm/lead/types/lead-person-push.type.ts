import { type PersonPush } from 'src/crm/lead/types/person-push.type';

// A value a lead save sends to its contact; the lead gets the note when the
// contact cannot take it.
export type LeadPersonPush = { leadId: string; push: PersonPush; locale: string | null };
