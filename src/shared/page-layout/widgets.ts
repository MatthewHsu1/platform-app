import {
  getSystemRecordPageLayoutUniversalIdentifier,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export const systemRecordPageLayoutId = (objectUniversalIdentifier: string): string =>
  getSystemRecordPageLayoutUniversalIdentifier({
    objectMetadataApplicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier,
  });

// The view is what makes the table show columns; without it a relation shows as chips.
export const tableWidget = (
  universalIdentifier: string,
  title: string,
  fieldMetadataId: string,
  viewId: string,
) => ({
  universalIdentifier,
  title,
  type: 'FIELD' as const,
  configuration: {
    configurationType: 'FIELD' as const,
    fieldMetadataId,
    fieldDisplayMode: 'TABLE' as const,
    viewId,
  },
});

// A relation shown as a card that expands into the related record's own fields.
export const cardWidget = (universalIdentifier: string, title: string, fieldMetadataId: string) => ({
  universalIdentifier,
  title,
  type: 'FIELD' as const,
  configuration: {
    configurationType: 'FIELD' as const,
    fieldMetadataId,
    fieldDisplayMode: 'CARD' as const,
  },
});

// A table of a relation two hops away (batch, then its transfers, then their move lines).
export const nestedTableWidget = (
  universalIdentifier: string,
  title: string,
  fieldMetadataId: string,
  nestedRelationFieldMetadataId: string,
  viewId: string,
) => ({
  universalIdentifier,
  title,
  type: 'FIELD' as const,
  configuration: {
    configurationType: 'FIELD' as const,
    fieldMetadataId,
    fieldDisplayMode: 'TABLE' as const,
    nestedRelationFieldMetadataId,
    viewId,
  },
});

export const frontComponentWidget = (
  universalIdentifier: string,
  title: string,
  frontComponentUniversalIdentifier: string,
) => ({
  universalIdentifier,
  title,
  type: 'FRONT_COMPONENT' as const,
  configuration: {
    configurationType: 'FRONT_COMPONENT' as const,
    frontComponentUniversalIdentifier,
  },
});

export const recordPageTab = <TWidget>({
  universalIdentifier,
  objectUniversalIdentifier,
  title,
  position,
  icon,
  widgets,
}: {
  universalIdentifier: string;
  objectUniversalIdentifier: string;
  title: string;
  position: number;
  icon: string;
  widgets: TWidget[];
}) => ({
  universalIdentifier,
  pageLayoutUniversalIdentifier: systemRecordPageLayoutId(objectUniversalIdentifier),
  title,
  position,
  icon,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets,
});
