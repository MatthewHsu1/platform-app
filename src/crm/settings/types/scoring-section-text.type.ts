import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';

// The settings page hands each section its texts: the translation extractor reads only front-component files.
export type ScoringSectionText = {
  title: MessageDescriptor;
  stage: MessageDescriptor;
  summary: MessageDescriptor;
  rebuildNightly: MessageDescriptor;
  countFrom: MessageDescriptor;
  updated: MessageDescriptor;
  update: MessageDescriptor;
  fieldLabels: Record<PlsFieldKey, MessageDescriptor>;
};
