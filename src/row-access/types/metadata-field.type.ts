// The slice of the metadata API the settings page reads.
export type MetadataField = {
  id: string;
  name: string;
  label: string;
  type: string;
  isActive?: boolean | null;
  relation?: {
    type: string;
    targetObjectMetadata: { nameSingular: string };
  } | null;
};
