import { defineCommandMenuItem } from 'twenty-sdk/define';

type CommandMenuItemConfig = Parameters<typeof defineCommandMenuItem>[0];

// A Print command for one or many selected records.
export const makePrintCommand = ({
  label,
  objectUniversalIdentifier,
  frontComponentUniversalIdentifier,
  commandUniversalIdentifier,
  condition,
}: {
  label: string;
  objectUniversalIdentifier: string;
  frontComponentUniversalIdentifier: string;
  commandUniversalIdentifier: string;
  condition?: CommandMenuItemConfig['conditionalAvailabilityExpression'];
}) =>
  defineCommandMenuItem({
    universalIdentifier: commandUniversalIdentifier,
    label,
    icon: 'IconPrinter',
    availabilityType: 'RECORD_SELECTION',
    availabilityObjectUniversalIdentifier: objectUniversalIdentifier,
    ...(condition === undefined ? {} : { conditionalAvailabilityExpression: condition }),
    frontComponentUniversalIdentifier,
  });
