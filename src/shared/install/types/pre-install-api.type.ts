export type PreInstallApi = {
  findObject: (universalIdentifier: string) => Promise<{ id: string; fields: { id: string; name: string; type: string }[] } | null>;
  listViews: (objectMetadataId: string) => Promise<{ id: string; name: string; mainGroupByFieldMetadataId: string | null }[]>;
  destroyView: (viewId: string) => Promise<void>;
  deactivateField: (fieldId: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
};
