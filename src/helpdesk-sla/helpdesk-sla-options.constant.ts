import { type SelectFieldOption } from 'src/shared/fields';

export const SLA_STATE = { ACCOMPLISHED: 'ACCOMPLISHED', IN_PROGRESS: 'IN_PROGRESS', EXPIRED: 'EXPIRED', ON_HOLD: 'ON_HOLD' } as const;

export const SLA_STATE_OPTIONS: SelectFieldOption[] = [
  { value: SLA_STATE.ACCOMPLISHED, label: 'Accomplished', color: 'green' },
  { value: SLA_STATE.IN_PROGRESS, label: 'In progress', color: 'orange' },
  { value: SLA_STATE.EXPIRED, label: 'Expired', color: 'red' },
  { value: SLA_STATE.ON_HOLD, label: 'On hold', color: 'gray' },
];
