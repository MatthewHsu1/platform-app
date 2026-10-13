import { defineLogicFunction } from 'twenty-sdk/define';

import { COLOR_INDEX_NAMES } from 'src/crm/color-index.constant';
import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import {
  leadRouteHandler,
  readLeadId,
  readLeadsAsUser,
  SELECT_ONE_LEAD,
  updateLeadAsUser,
} from 'src/crm/lead/actions/lead-action-route';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { readScoringRows } from 'src/crm/scoring/read-scoring-rows';
import { SCORING_FACTORS_MESSAGES } from 'src/crm/scoring/scoring-messages.constant';
import {
  SCORING_FACTORS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SCORING_FACTORS_ROUTE_PATH,
} from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { EMPTY_QUALITY_VALUE, SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringFactor } from 'src/crm/scoring/types/scoring-factor.type';
import { type TooltipEntry } from 'src/crm/scoring/types/tooltip-entry.type';
import { planTooltip } from 'src/crm/scoring/utils/plan-tooltip.util';
import { scoreLeads, scoringFactors } from 'src/crm/scoring/utils/score-leads.util';
import { scoringVariablesOf } from 'src/crm/scoring/utils/scoring-variables-of.util';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { requireUpdateRights } from 'src/shared/object-rights';
import { records } from 'src/shared/triggers/records';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';
import { floatRound } from 'src/shared/utils/float-round.util';

type Option = { value: string; label: string; color: string | null };

// Staff own the language and tag lists, so their labels are read at click time.
const readStaffListOptions = async () => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: { fieldsList: { name: string; options: Option[] | null }[] } }[] } }>(
      'application',
      `query LeadLists($objectUniversalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $objectUniversalIdentifier } }, paging: { first: 1 }) {
          edges { node { fieldsList { name options } } }
        }
      }`,
      { objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the lead lists',
  );
  const fields = data.objects.edges[0]?.node.fieldsList ?? [];
  const optionsOf = (name: string) =>
    new Map((fields.find((field) => field.name === name)?.options ?? []).map((option) => [option.value, option]));

  return { language: optionsOf('language'), tags: optionsOf('tags') };
};

const SAMPLE_WORDS: Record<string, string> = {
  New: SCORING_FACTORS_MESSAGES.sampleStage,
  Exploration: SCORING_FACTORS_MESSAGES.sampleLowTag,
  Consulting: SCORING_FACTORS_MESSAGES.sampleTopTag,
  Belgium: SCORING_FACTORS_MESSAGES.sampleCountry,
};
const SAMPLE_TAG_COLORS: Record<string, string> = { Exploration: COLOR_INDEX_NAMES[4], Consulting: COLOR_INDEX_NAMES[3] };

const handler = leadRouteHandler(async (body) => {
  const locale = await readUserLocale();
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }
  // Read as the clicking user first: a lead they cannot see is not found.
  const [lead] = await readLeadsAsUser([leadId], { withScoringFields: true });

  if (lead.wonStatus !== WON_STATUS.PENDING) {
    throw new LeadActionError(SCORING_FACTORS_MESSAGES.notPending);
  }
  const settings = await readCrmSettings();
  const context = await loadLeadContext([]);
  const rows = await readScoringRows(scoringVariablesOf(settings.plsFields));
  const plan = planTooltip({
    probability: scoreLeads([lead], rows, context.stages, settings.plsFields).get(lead.id) ?? null,
    factors: scoringFactors(lead, rows, context.stages, settings.plsFields),
  });
  const isAutomatic = floatRound(lead.probability ?? 0, 0.01) === floatRound(lead.automatedProbability ?? 0, 0.01);
  const automatedChanged = lead.automatedProbability !== plan.probability;
  const probabilityChanged = isAutomatic && lead.probability !== plan.probability;

  // The explanation refreshes the stored values, so the lead shows what the panel explains.
  if (automatedChanged || probabilityChanged) {
    await requireUpdateRights([CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER]);
  }
  // The person's write goes first: a lead their row rule keeps from updates
  // is refused before the app writes anything.
  if (probabilityChanged) {
    await updateLeadAsUser(lead.id, { probability: plan.probability });
  }
  if (automatedChanged) {
    await writeLeadsAsApplication([{ leadId: lead.id, data: { automatedProbability: plan.probability } }]);
  }

  const options = await readStaffListOptions();
  const sourceIds = [...plan.top, ...plan.low].filter((entry) => entry.variable === SCORING_VARIABLE.source).map((entry) => entry.value);
  const sources = await records('utmSource', 'utmSources').find<{ id: string; name: string | null }>({ id: { in: sourceIds } }, 'id name');
  const qualityLabel = (value: string) =>
    translate(
      locale,
      value === 'CORRECT'
        ? SCORING_FACTORS_MESSAGES.correct
        : value === 'INCORRECT'
          ? SCORING_FACTORS_MESSAGES.incorrect
          : SCORING_FACTORS_MESSAGES.notSet,
    );
  const sampleWord = (value: string) => translate(locale, SAMPLE_WORDS[value] ?? value);
  const describe = (entry: ScoringFactor): TooltipEntry => {
    const base = { variable: entry.variable, score: entry.score, color: null };

    switch (entry.variable) {
      case SCORING_VARIABLE.phoneState:
      case SCORING_VARIABLE.emailState:
        return { ...base, label: qualityLabel(entry.value === EMPTY_QUALITY_VALUE ? '' : entry.value) };
      case SCORING_VARIABLE.stage:
        return {
          ...base,
          label: plan.usesSample ? sampleWord(entry.value) : (context.stages.find((stage) => stage.id === entry.value)?.name ?? entry.value),
        };
      case SCORING_VARIABLE.source:
        return { ...base, label: sources.find((source) => source.id === entry.value)?.name ?? entry.value };
      case SCORING_VARIABLE.language:
        return { ...base, label: options.language.get(entry.value)?.label ?? entry.value };
      case SCORING_VARIABLE.tag: {
        if (plan.usesSample) {
          return { ...base, label: sampleWord(entry.value), color: SAMPLE_TAG_COLORS[entry.value] ?? null };
        }
        const option = options.tags.get(entry.value);

        return { ...base, label: option?.label ?? entry.value, color: option?.color ?? null };
      }
      default:
        return { ...base, label: plan.usesSample ? sampleWord(entry.value) : entry.value };
    }
  };

  return {
    probability: plan.probability,
    teamName: context.teams.find((team) => team.id === lead.teamId)?.name ?? null,
    usesSample: plan.usesSample,
    top: plan.top.map(describe),
    low: plan.low.map(describe),
  };
});

export default defineLogicFunction({
  universalIdentifier: SCORING_FACTORS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'lead-scoring-factors',
  description: 'Explains the automated probability of a lead with its strongest and weakest values, and refreshes it.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SCORING_FACTORS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
