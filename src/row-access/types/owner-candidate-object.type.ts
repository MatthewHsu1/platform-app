import { type OwnerCandidateField } from 'src/row-access/types/owner-candidate-field.type';

export type OwnerCandidateObject = {
  objectMetadataId: string;
  label: string;
  ownerFields: OwnerCandidateField[];
};
