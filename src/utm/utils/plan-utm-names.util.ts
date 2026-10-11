import { type CampaignDefaultsPlan } from 'src/utm/types/campaign-defaults-plan.type';
import { uniqueNames } from 'src/utm/utils/unique-names.util';

const filled = (value: string | null | undefined): value is string => value !== null && value !== undefined && value.trim() !== '';

// A new campaign: its identifier goes through the counter, the creator is
// responsible and the first stage is its stage when none is set. An
// identifier an archived campaign holds cannot be stored twice: refused.
export const planCampaignDefaults = ({
  created,
  existingActiveNames,
  archivedNames,
  firstStageId,
}: {
  created: { id: string; name: string | null; responsibleId: string | null; stageId: string | null; creatorMemberId: string | null }[];
  existingActiveNames: string[];
  archivedNames: string[];
  firstStageId: string | null;
}): CampaignDefaultsPlan[] => {
  const names = uniqueNames(
    created.map((campaign) => campaign.name),
    existingActiveNames,
  );

  return created.map((campaign, index) => {
    const name = names[index];

    if (name !== null && archivedNames.includes(name)) {
      return { id: campaign.id, kind: 'refuse' };
    }

    const data: Record<string, unknown> = {};

    if (name !== null && name !== campaign.name) {
      data.name = name;
    }
    if (campaign.responsibleId === null && campaign.creatorMemberId !== null) {
      data.responsibleId = campaign.creatorMemberId;
    }
    if (campaign.stageId === null && firstStageId !== null) {
      data.stageId = firstStageId;
    }

    return { id: campaign.id, kind: 'write', data };
  });
};

type UniqueNamePlan = { id: string; kind: 'write'; name: string } | { id: string; kind: 'refuse' };

// New sources and mediums take a free name through the counter.
export const planUniqueNameCreate = ({
  created,
  existingNames,
  archivedNames,
}: {
  created: { id: string; name: string | null }[];
  existingNames: string[];
  archivedNames: string[];
}): UniqueNamePlan[] => {
  const names = uniqueNames(
    created.map((row) => row.name),
    existingNames,
  );

  return created.flatMap((row, index): UniqueNamePlan[] => {
    const name = names[index];

    if (name === null) {
      return [];
    }
    if (archivedNames.includes(name)) {
      return [{ id: row.id, kind: 'refuse' }];
    }

    return name === row.name ? [] : [{ id: row.id, kind: 'write', name }];
  });
};

export const findNameClash = (name: string | null, others: { id: string; name: string | null }[], selfId: string) =>
  name !== null && others.some((other) => other.id !== selfId && other.name === name);

const REQUIRED_CAMPAIGN_FIELDS = ['name', 'responsibleId', 'stageId'] as const;

type RequiredCampaignValues = Record<(typeof REQUIRED_CAMPAIGN_FIELDS)[number], string | null>;

export const emptiedRequiredFields = (before: RequiredCampaignValues, after: RequiredCampaignValues) =>
  REQUIRED_CAMPAIGN_FIELDS.filter((field) => filled(before[field]) && !filled(after[field]));
