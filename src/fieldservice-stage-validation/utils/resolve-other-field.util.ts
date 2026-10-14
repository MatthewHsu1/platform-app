import { type OrderFieldInfo } from 'src/fieldservice-stage-validation/types/order-field-info.type';
import { type StageRuleCheck } from 'src/fieldservice-stage-validation/types/stage-rule-check.type';
import { type StageRuleField } from 'src/fieldservice-stage-validation/types/stage-rule-field.type';

const FILLED_TYPES = new Set(['TEXT', 'DATE', 'DATE_TIME', 'SELECT', 'MULTI_SELECT', 'ARRAY']);

type Resolved = { kind: 'field'; field: StageRuleField } | { kind: 'skipped'; reason: string };

const fieldOf = (info: OrderFieldInfo, check: StageRuleCheck, key: string, selection: string): Resolved => ({
  kind: 'field',
  field: { value: info.name, label: info.label, field: key, ruleName: info.name, selection, check },
});

// A field staff added to the order, read from the metadata of the order at the time it is checked. Text, dates,
// lists, a number (above zero), a flag (on), rich text and a link to one record can be checked; any other type is
// left out with the reason.
export const resolveOtherField = (name: string, fields: OrderFieldInfo[]): Resolved => {
  const info = fields.find((candidate) => candidate.name === name);

  if (info === undefined || !info.isActive) {
    return { kind: 'skipped', reason: 'the service order has no such field' };
  }
  if (FILLED_TYPES.has(info.type)) {
    return fieldOf(info, 'filled', name, name);
  }
  if (info.type === 'NUMBER') {
    return fieldOf(info, 'positive', name, name);
  }
  if (info.type === 'BOOLEAN') {
    return fieldOf(info, 'true', name, name);
  }
  if (info.type === 'RICH_TEXT') {
    return fieldOf(info, 'filled', name, `${name} { markdown }`);
  }
  if (info.type === 'RELATION' && info.settings?.relationType === 'MANY_TO_ONE') {
    const column = info.settings.joinColumnName ?? `${name}Id`;

    return fieldOf(info, 'defined', column, column);
  }
  return { kind: 'skipped', reason: `a field of type ${info.type} cannot be checked` };
};
