import { defineCommandMenuItem } from 'twenty-sdk/define';

// A Print command for one or many selected records. A command shown only under a condition is
// written out with defineCommandMenuItem in its own file: the build turns the condition into text
// from that file's source, so it cannot be passed in here.
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
}) =>
  defineCommandMenuItem({
    universalIdentifier: commandUniversalIdentifier,
    label,
    icon: 'IconPrinter',
    availabilityType: 'RECORD_SELECTION',
    availabilityObjectUniversalIdentifier: objectUniversalIdentifier,
    frontComponentUniversalIdentifier,
  });
