import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The settings page hands each section its texts: the translation extractor reads only front-component files.
export type CrmSectionText = {
  title: MessageDescriptor;
  leads: MessageDescriptor;
  leadsHelp: MessageDescriptor;
  recurring: MessageDescriptor;
  recurringHelp: MessageDescriptor;
  multiTeams: MessageDescriptor;
  multiTeamsHelp: MessageDescriptor;
};
