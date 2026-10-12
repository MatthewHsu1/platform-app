import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { SCORING_VARIABLE, TAG_MIN_COUNT } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringFactor } from 'src/crm/scoring/types/scoring-factor.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { scoringPairs } from 'src/crm/scoring/utils/scoring-pairs.util';
import { floatRound } from 'src/shared/utils/float-round.util';

type Counts = { won: number; lost: number };
type VariableCounts = { wonTotal: number; lostTotal: number; values: Map<string, Counts> };
type Bucket = Map<string, VariableCounts>;
type Totals = { teamWon: number; teamLost: number };
type Scored = { probability: number | null; factors: ScoringFactor[] };

const GLOBAL_BUCKET = '';

const variableOf = (bucket: Bucket, variable: string) => {
  const existing = bucket.get(variable);

  if (existing !== undefined) {
    return existing;
  }
  const created: VariableCounts = { wonTotal: 0, lostTotal: 0, values: new Map() };

  bucket.set(variable, created);

  return created;
};

// Rows of one key are summed in the summed bucket. In a team's bucket the
// newest row of a key gives its counts, while the variable totals still take
// every row.
const addCounts = (bucket: Bucket, row: ScoringRow, newestWins: boolean) => {
  const counts = variableOf(bucket, row.variable);
  const value = newestWins ? { won: 0, lost: 0 } : (counts.values.get(row.value) ?? { won: 0, lost: 0 });

  value.won += row.wonCount;
  value.lost += row.lostCount;
  counts.values.set(row.value, value);
  counts.wonTotal += row.wonCount;
  counts.lostTotal += row.lostCount;
};

// One bucket per team that has rows of the used variables (its own rows
// only), and one of every row summed. A team keeps its bucket even when its
// only rows are rare tags: its leads are then scored on that bucket, not on
// the summed one.
const buildBuckets = (rows: ScoringRow[], variables: ReadonlySet<string>) => {
  const buckets = new Map<string, Bucket>([[GLOBAL_BUCKET, new Map()]]);

  const oldestFirst = [...rows].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));

  for (const row of oldestFirst) {
    if (!variables.has(row.variable)) {
      continue;
    }
    const teamBucket = row.teamId === null ? undefined : (buckets.get(row.teamId) ?? new Map<string, VariableCounts>());

    if (row.teamId !== null && teamBucket !== undefined) {
      buckets.set(row.teamId, teamBucket);
    }
    if (row.variable === SCORING_VARIABLE.tag && row.wonCount + row.lostCount < TAG_MIN_COUNT) {
      continue;
    }
    if (teamBucket !== undefined) {
      addCounts(teamBucket, row, true);
    }
    addCounts(buckets.get(GLOBAL_BUCKET) ?? new Map(), row, false);
  }

  return buckets;
};

// The counts of the first stage shared by every team give the number of won
// and lost leads: a won lead counts in every stage, a lost one in its stage
// and every earlier one, so the first stage holds them all.
const firstSharedStage = (stages: StageRow[]) =>
  [...stages]
    .filter((stage) => stage.teamIds.length === 0)
    .sort(
      (left, right) =>
        left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    )[0];

const totalsOf = (bucket: Bucket, firstStageId: string | undefined): Totals => {
  const counts = firstStageId === undefined ? undefined : bucket.get(SCORING_VARIABLE.stage)?.values.get(firstStageId);

  return counts === undefined ? { teamWon: 0, teamLost: 0 } : { teamWon: counts.won, teamLost: counts.lost };
};

const scoreOne = (
  lead: LeadRow,
  buckets: Map<string, Bucket>,
  stages: StageRow[],
  firstStageId: string | undefined,
  fields: readonly PlsFieldKey[],
): Scored => {
  if (lead.stageId === null) {
    return { probability: 0, factors: [] };
  }
  if (stages.some((stage) => stage.id === lead.stageId && stage.isWon)) {
    return { probability: 100, factors: [] };
  }
  const bucket = (lead.teamId === null ? undefined : buckets.get(lead.teamId)) ?? buckets.get(GLOBAL_BUCKET) ?? new Map();
  const { teamWon, teamLost } = totalsOf(bucket, firstStageId);

  if (teamWon === 0 || teamLost === 0) {
    return { probability: null, factors: [] };
  }
  const total = teamWon + teamLost;
  let scoreWon = teamWon / total;
  let scoreLost = teamLost / total;
  const factors: ScoringFactor[] = [];

  for (const [variable, value] of scoringPairs(lead, fields)) {
    const counts = bucket.get(variable);
    const valueCounts = counts?.values.get(value);

    if (counts === undefined || valueCounts === undefined) {
      continue;
    }
    const isStage = variable === SCORING_VARIABLE.stage;
    const denominatorWon = isStage ? teamWon : counts.wonTotal;
    const denominatorLost = isStage ? teamLost : counts.lostTotal;

    if (denominatorWon === 0 || denominatorLost === 0) {
      continue;
    }
    const probabilityWon = valueCounts.won / denominatorWon;
    const probabilityLost = valueCounts.lost / denominatorLost;

    scoreWon *= probabilityWon;
    scoreLost *= probabilityLost;
    factors.push({
      variable,
      value,
      score: isStage ? 1 - probabilityLost : probabilityWon / (probabilityWon + probabilityLost),
    });
  }
  const probability = floatRound((100 * scoreWon) / (scoreWon + scoreLost), 0.01);

  return { probability: Math.min(Math.max(probability, 0.01), 99.99), factors };
};

const usedVariables = (leads: LeadRow[], fields: readonly PlsFieldKey[]) =>
  new Set(leads.flatMap((lead) => scoringPairs(lead, fields).map(([variable]) => variable)));

// The automated probability of each lead: null when the counts cannot give
// one, so the lead keeps its stored values.
export const scoreLeads = (
  leads: LeadRow[],
  rows: ScoringRow[],
  stages: StageRow[],
  fields: readonly PlsFieldKey[],
): Map<string, number | null> => {
  const buckets = buildBuckets(rows, usedVariables(leads, fields));
  const firstStageId = firstSharedStage(stages)?.id;

  return new Map(leads.map((lead) => [lead.id, scoreOne(lead, buckets, stages, firstStageId, fields).probability]));
};

// How much each of the lead's values pushes the score up (above 0.5) or down.
// When the lead's team has rows, only that team's rows are read.
export const scoringFactors = (
  lead: LeadRow,
  rows: ScoringRow[],
  stages: StageRow[],
  fields: readonly PlsFieldKey[],
): ScoringFactor[] => {
  const variables = usedVariables([lead], fields);
  const teamHasRows = lead.teamId !== null && rows.some((row) => row.teamId === lead.teamId && variables.has(row.variable));
  const scopedRows = teamHasRows ? rows.filter((row) => row.teamId === lead.teamId) : rows;

  return scoreOne(lead, buildBuckets(scopedRows, variables), stages, firstSharedStage(stages)?.id, fields).factors;
};
