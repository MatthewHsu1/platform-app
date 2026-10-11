import { type CommandMenuItemConfig } from 'twenty-sdk/define';

// The settings of a Print command for one or many selected records. Each command file calls
// defineCommandMenuItem itself: the build finds commands only by that call in the file. A command
// shown only under a condition is written out in full in its own file, as the build turns the
// condition into text from that file's source.
export const makePrintCommand = ({
  label,
  objectUniversalIdentifier,
  frontComponentUniversalIdentifier,
  commandUniversalIdentifier,
}: {
  label: string;
  objectUniversalIdentifier: string;
  frontComponentUniversalIdentifier: string;
  commandUniversalIdentifier: string;
}): CommandMenuItemConfig => ({
  universalIdentifier: commandUniversalIdentifier,
  label,
  icon: 'IconPrinter',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: objectUniversalIdentifier,
  frontComponentUniversalIdentifier,
});
