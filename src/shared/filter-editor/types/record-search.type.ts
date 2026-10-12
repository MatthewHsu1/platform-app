import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';

// Finds records by their label text, or reads the labels of known ids.
export type RecordSearch = (input: {
  objectPlural: string;
  labelField: string;
  labelKind: 'text' | 'fullName';
  text?: string;
  ids?: string[];
}) => Promise<PickedRecord[]>;
