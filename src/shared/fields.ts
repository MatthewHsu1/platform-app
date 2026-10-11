import {
  FieldType,
  MetadataWritability,
  NumberDataType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';

// A field only app code writes: the API refuses a user's value.
export const appWritten = <TField extends object>(field: TField) => ({
  ...field,
  writability: MetadataWritability.APPLICATION,
  isUIEditable: false,
});

export const manyToOneField = ({
  universalIdentifier,
  name,
  label,
  icon,
  targetObjectUniversalIdentifier,
  targetFieldUniversalIdentifier,
  onDelete = OnDeleteAction.SET_NULL,
}: {
  universalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  targetObjectUniversalIdentifier: string;
  targetFieldUniversalIdentifier: string;
  onDelete?: OnDeleteAction;
}) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.RELATION as const,
  relationTargetObjectMetadataUniversalIdentifier:
    targetObjectUniversalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: targetFieldUniversalIdentifier,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete,
    joinColumnName: `${name}Id`,
  },
});

export const oneToManyField = ({
  universalIdentifier,
  name,
  label,
  icon,
  targetObjectUniversalIdentifier,
  targetFieldUniversalIdentifier,
  junctionTargetFieldUniversalIdentifier,
}: {
  universalIdentifier: string;
  name: string;
  label: string;
  icon: string;
  targetObjectUniversalIdentifier: string;
  targetFieldUniversalIdentifier: string;
  junctionTargetFieldUniversalIdentifier?: string;
}) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.RELATION as const,
  relationTargetObjectMetadataUniversalIdentifier:
    targetObjectUniversalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: targetFieldUniversalIdentifier,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
    ...(junctionTargetFieldUniversalIdentifier === undefined
      ? {}
      : { junctionTargetFieldUniversalIdentifier }),
  },
});

// The `active` flag on lookup rows: staff retire a row instead of deleting
// it, so old records keep their link.
export const activeField = (universalIdentifier: string) => ({
  universalIdentifier,
  name: 'active',
  label: 'Active',
  type: FieldType.BOOLEAN as const,
  icon: 'IconCircleCheck',
  defaultValue: true,
});

export const currencyField = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
  defaultAmount = 0,
) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.CURRENCY as const,
  // The SDK types amountMicros as a string, but the server refuses a string
  // default ("should be single quoted") and takes a number.
  defaultValue: {
    amountMicros: (defaultAmount * 1_000_000) as unknown as string,
    currencyCode: `'${DEFAULT_CURRENCY_CODE}'`,
  },
});

export const numberField = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
  {
    decimals = 2,
    int = false,
    defaultValue,
  }: { decimals?: number; int?: boolean; defaultValue?: number } = {},
) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.NUMBER as const,
  settings: { dataType: int ? NumberDataType.INT : NumberDataType.FLOAT, decimals },
  ...(defaultValue === undefined ? {} : { defaultValue }),
});

export const textField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.TEXT as const,
});

export const appTextField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  ...textField(universalIdentifier, name, label, icon),
  writability: MetadataWritability.APPLICATION,
  isUIEditable: false,
  isAuditLogged: false,
});

// Seeded rows carry a stable key (`uom.product_uom_unit`).
// Code finds a seed row by it after staff rename the row.
export const seedKeyField = (universalIdentifier: string) =>
  appTextField(universalIdentifier, 'seedKey', 'Seed key', 'IconKey');

export const booleanField = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
  defaultValue: boolean,
) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.BOOLEAN as const,
  defaultValue,
});

export const filesField = (universalIdentifier: string, name: string, label: string, icon: string) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.FILES as const,
  universalSettings: { maxNumberOfValues: 1 },
});

export type SelectFieldColor =
  | 'red'
  | 'ruby'
  | 'crimson'
  | 'tomato'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'grass'
  | 'green'
  | 'jade'
  | 'mint'
  | 'turquoise'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'iris'
  | 'violet'
  | 'purple'
  | 'plum'
  | 'pink'
  | 'bronze'
  | 'gold'
  | 'brown'
  | 'gray';

export type SelectFieldOption = { value: string; label: string; color: SelectFieldColor };

export const selectField = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
  defaultValue: string,
  options: SelectFieldOption[],
) => ({
  universalIdentifier,
  name,
  label,
  icon,
  type: FieldType.SELECT as const,
  defaultValue: `'${defaultValue}'`,
  options: options.map((option, position) => ({ ...option, position })),
});

// Printed reports kept on a record: the newest 60.
export const printoutsField = (universalIdentifier: string) =>
  appWritten({
    ...filesField(universalIdentifier, 'printouts', 'Printouts', 'IconPrinter'),
    universalSettings: { maxNumberOfValues: 60 },
  });
