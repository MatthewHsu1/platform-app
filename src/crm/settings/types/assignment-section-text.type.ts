import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The settings page hands each section its texts: the translation extractor reads only front-component files.
export type AssignmentSectionText = {
  title: MessageDescriptor;
  ruleBased: MessageDescriptor;
  ruleBasedHelp: MessageDescriptor;
  running: MessageDescriptor;
  manually: MessageDescriptor;
  repeatedly: MessageDescriptor;
  assignmentDone: MessageDescriptor;
  assignNow: MessageDescriptor;
  repeatEvery: MessageDescriptor;
  minutes: MessageDescriptor;
  hours: MessageDescriptor;
  days: MessageDescriptor;
  weeks: MessageDescriptor;
  nextRun: MessageDescriptor;
};
