import { type MetadataField } from 'src/row-access/types/metadata-field.type';

export type MetadataObject = {
  id: string;
  universalIdentifier: string;
  applicationId: string;
  nameSingular: string;
  labelSingular: string;
  isSystem: boolean;
  isActive: boolean;
  fieldsList: MetadataField[];
};
