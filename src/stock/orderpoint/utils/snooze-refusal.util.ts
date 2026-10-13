// Only manual rules can be snoozed: an automatic rule is archived instead.
export const snoozeRefusal = ({
  created,
  trigger,
  snoozedUntil,
  snoozedUntilChanged,
}: {
  created: boolean;
  trigger: 'AUTO' | 'MANUAL';
  snoozedUntil: string | null;
  snoozedUntilChanged: boolean;
}): 'createSnoozedAuto' | 'snoozeAuto' | null => {
  if (trigger !== 'AUTO') {
    return null;
  }
  if (created) {
    return snoozedUntil === null ? null : 'createSnoozedAuto';
  }
  return snoozedUntilChanged ? 'snoozeAuto' : null;
};
