import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type UtmNamedObject } from 'src/utm/types/utm-named-object.type';
import { type UtmRow } from 'src/utm/types/utm-row.type';

export type UtmTriggerApi = {
  // Rows whose name contains one of the bases, any case, archived ones too; not those in the trash.
  findNamesLike: (object: UtmNamedObject, bases: string[]) => Promise<UtmRow[]>;
  // Rows with exactly this name, archived ones too; not those in the trash.
  findByName: (object: UtmNamedObject, name: string) => Promise<UtmRow[]>;
  update: (object: UtmNamedObject | 'utmTag', id: string, data: Record<string, unknown>) => Promise<void>;
  putBack: (object: UtmNamedObject, id: string, data: Record<string, unknown>, reason: string) => Promise<void>;
  destroy: (object: UtmNamedObject, ids: string[]) => Promise<void>;
  // The rows still in the trash, with their seed key.
  stillDeleted: (object: UtmNamedObject | 'utmStage' | 'utmTag', ids: string[]) => Promise<{ id: string; seedKey: string | null }[]>;
  restoreWithNote: (object: UtmNamedObject | 'utmStage', id: string, reason: string) => Promise<void>;
  firstStageId: () => Promise<string | null>;
  stageIdsInUse: (stageIds: string[]) => Promise<Set<string>>;
  clearOnLeads: (field: 'campaignId' | 'sourceId' | 'mediumId', ids: string[]) => Promise<void>;
  destroyTagLinks: (field: 'campaignId' | 'tagId', ids: string[]) => Promise<void>;
  pickColor: () => string;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string, values?: TranslationValues) => string;
};
