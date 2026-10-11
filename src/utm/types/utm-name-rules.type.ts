// How a source or medium keeps its names and default rows.
export type UtmNameRules = {
  object: 'utmSource' | 'utmMedium';
  leadField: 'sourceId' | 'mediumId';
  // Archived rows hold their name against new ones; without this every row
  // counts as a used name.
  archivedHoldNames: boolean;
  protectedSeedKeys: readonly string[];
  protectedMessage: string;
};
