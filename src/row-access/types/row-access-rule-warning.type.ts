export type RowAccessRuleWarning = {
  objectMetadataId: string;
  ownerFieldMetadataId: string;
  isEnabled: boolean;
  reason: 'object-unavailable' | 'owner-field-invalid' | 'duplicate-object';
};
