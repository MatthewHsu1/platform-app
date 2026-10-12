import { type MessageDescriptor } from 'twenty-sdk/front-component';

// The settings page hands each section its texts: the translation extractor reads only front-component files.
export type PlugPointSectionText = {
  title: MessageDescriptor;
  enabled: MessageDescriptor;
  target: MessageDescriptor;
  route: MessageDescriptor;
  url: MessageDescriptor;
  timeout: MessageDescriptor;
  onError: MessageDescriptor;
  useBuiltIn: MessageDescriptor;
  skip: MessageDescriptor;
  leftOut: MessageDescriptor;
  assignBuiltIn: MessageDescriptor;
  leaveThem: MessageDescriptor;
  keySet: MessageDescriptor;
  keyNew: MessageDescriptor;
};
