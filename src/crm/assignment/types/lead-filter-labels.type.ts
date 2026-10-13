import { type MessageDescriptor } from 'twenty-sdk/front-component';

// Translatable labels of the lead filter fields and of their fixed choices,
// keyed by field name and by choice value.
export type LeadFilterLabels = {
  fields: Record<string, MessageDescriptor>;
  options: Record<string, MessageDescriptor>;
};
