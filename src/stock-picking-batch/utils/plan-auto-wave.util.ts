import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type AutoWaveLine } from 'src/stock-picking-batch/types/auto-wave-line.type';
import { type AutoWaveType } from 'src/stock-picking-batch/types/auto-wave-type.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type ExistingWave } from 'src/stock-picking-batch/types/existing-wave.type';
import { autoBatchDescription } from 'src/stock-picking-batch/utils/plan-find-auto-batch.util';
import { wavesAutomatically } from 'src/stock-picking-batch/utils/waves-automatically.util';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';

type Input = {
  lines: AutoWaveLine[];
  types: ReadonlyMap<string, AutoWaveType>;
  existingWaves: ExistingWave[];
  // Each location's parent, for the locations of the lines and of the waves' lines.
  locationParents: ReadonlyMap<string, string | null>;
  locationCompleteNames: ReadonlyMap<string, string>;
  skipWaveableCheck: boolean;
  batchesToValidate: string[];
  digits: number;
};

// A wave matches a line's value when all its records hold exactly that value.
const holdsOnly = <TValue>(values: TValue[], value: TValue) => {
  const distinct = [...new Set(values.filter((entry) => entry !== null))];

  return value === null ? distinct.length === 0 : distinct.length === 1 && distinct[0] === value;
};

// A transfer value a type groups by: a line without it can never join an open
// wave, since the wave must already hold that value.
const holdsTransferValue = <TValue>(values: TValue[], value: TValue) => value !== null && holdsOnly(values, value);

const creationOrder = (left: AutoWaveLine, right: AutoWaveLine) =>
  left.pickingCreatedAt.localeCompare(right.pickingCreatedAt) ||
  left.pickingId.localeCompare(right.pickingId) ||
  left.moveCreatedAt.localeCompare(right.moveCreatedAt) ||
  left.moveId.localeCompare(right.moveId);

// Puts move lines into the open waves of their operation type that share
// their group values, else into new waves with the other lines that do.
export const planAutoWave = (input: Input) => {
  const { types, locationParents, digits } = input;

  const isChildOf = (locationId: string, ancestorId: string) => {
    for (let current: string | null | undefined = locationId; current !== null && current !== undefined; current = locationParents.get(current)) {
      if (current === ancestorId) {
        return true;
      }
    }
    return false;
  };
  // The closest location at or above the line's that is a wave location.
  const nearest = (type: AutoWaveType, locationId: string) => {
    for (let current: string | null | undefined = locationId; current !== null && current !== undefined; current = locationParents.get(current)) {
      if (type.waveLocationIds.includes(current)) {
        return current;
      }
    }
    return null;
  };
  const isWaveable = (line: AutoWaveLine, type: AutoWaveType | undefined): type is AutoWaveType =>
    type !== undefined &&
    (input.skipWaveableCheck || (line.pickingState === PICKING_STATE.ASSIGNED && !isZeroAtDigits(line.quantity, digits))) &&
    !line.inWave &&
    wavesAutomatically(type) &&
    (!type.waveGroupByCategory || (line.categoryId !== null && type.waveCategoryIds.includes(line.categoryId)));
  // A count left out (0) is not checked: the move or transfer is already in the wave.
  const fits = (type: AutoWaveType, moves: number, pickings: number) =>
    (moves === 0 || type.batchMaxLines === 0 || moves <= type.batchMaxLines) &&
    (pickings === 0 || type.batchMaxPickings === 0 || pickings <= type.batchMaxPickings);
  const description = (type: AutoWaveType, line: AutoWaveLine) =>
    [
      autoBatchDescription(type, line.groupValues),
      type.waveGroupByProduct ? line.productName : '',
      type.waveGroupByCategory ? line.categoryCompleteName : '',
      type.waveGroupByLocation ? (input.locationCompleteNames.get(nearest(type, line.locationId) ?? '') ?? '') : '',
    ]
      .filter((part) => part !== '')
      .join(', ');

  const batchable = input.lines.filter((line) => {
    const type = types.get(line.pickingTypeId);

    return isWaveable(line, type) && (!type.waveGroupByLocation || nearest(type, line.locationId) !== null);
  });
  const typeIds = [...new Set(batchable.map((line) => line.pickingTypeId))];
  const existing: { waveId: string; lineIds: string[] }[] = [];
  const created: { pickingTypeId: string; description: string; lineIds: string[] }[] = [];
  const assigned = new Set<string>();

  for (const typeId of typeIds) {
    const type = types.get(typeId) as AutoWaveType;
    const lines = batchable.filter((line) => line.pickingTypeId === typeId);
    const openStates: BatchState[] = type.batchAutoConfirm ? [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS] : [BATCH_STATE.DRAFT];
    // Highest number first. With group by location, a wave counts only when
    // all its lines sit under one wave location, the deepest such one.
    const waves = input.existingWaves
      .filter((wave) => wave.pickingTypeId === typeId && openStates.includes(wave.state) && !input.batchesToValidate.includes(wave.id))
      .sort((left, right) => right.name.localeCompare(left.name))
      .map((wave) => ({
        wave,
        nearest: type.waveGroupByLocation
          ? ([...type.waveLocationIds].reverse().find((waveLocationId) => wave.lines.every((waveLine) => isChildOf(waveLine.locationId, waveLocationId))) ?? null)
          : null,
      }))
      .filter((entry) => !type.waveGroupByLocation || entry.nearest !== null);
    const addedMoves = new Map<string, Set<string>>();
    const addedPickings = new Map<string, Set<string>>();
    const joined = new Map<string, string[]>();
    const remaining: AutoWaveLine[] = [];

    for (const line of lines) {
      const target = waves.find(({ wave, nearest: waveNearest }) => {
        if (
          (type.batchGroupByPartner && !holdsTransferValue(wave.pickingGroups.map((group) => group.partnerKey), line.partnerKey)) ||
          (type.batchGroupByDestination && !holdsTransferValue(wave.pickingGroups.map((group) => group.countryKey), line.countryKey)) ||
          (type.batchGroupBySrcLoc && !holdsTransferValue(wave.pickingGroups.map((group) => group.locationId), line.locationId)) ||
          (type.batchGroupByDestLoc && !holdsTransferValue(wave.pickingGroups.map((group) => group.locationDestId), line.locationDestId)) ||
          (type.waveGroupByProduct && !holdsOnly(wave.lines.map((waveLine) => waveLine.productId), line.productId)) ||
          (type.waveGroupByCategory && !holdsOnly(wave.lines.map((waveLine) => waveLine.categoryId), line.categoryId)) ||
          (type.waveGroupByLocation && waveNearest !== nearest(type, line.locationId))
        ) {
          return false;
        }
        const moves = addedMoves.get(wave.id) ?? new Set<string>();
        const pickings = addedPickings.get(wave.id) ?? new Set<string>();
        const newMove = !wave.lines.some((waveLine) => waveLine.moveId === line.moveId) && !moves.has(line.moveId);
        const newPicking = !wave.lines.some((waveLine) => waveLine.pickingId === line.pickingId) && !pickings.has(line.pickingId);

        return fits(type, newMove ? wave.moveCount + moves.size + 1 : 0, newPicking ? wave.pickingCount + pickings.size + 1 : 0);
      });

      if (target === undefined) {
        remaining.push(line);
        continue;
      }
      const waveId = target.wave.id;

      // Only what is new to the wave counts toward its limits.
      if (!target.wave.lines.some((waveLine) => waveLine.moveId === line.moveId)) {
        addedMoves.set(waveId, (addedMoves.get(waveId) ?? new Set<string>()).add(line.moveId));
      }
      if (!target.wave.lines.some((waveLine) => waveLine.pickingId === line.pickingId)) {
        addedPickings.set(waveId, (addedPickings.get(waveId) ?? new Set<string>()).add(line.pickingId));
      }
      joined.set(waveId, [...(joined.get(waveId) ?? []), line.id]);
      assigned.add(line.id);
    }
    joined.forEach((lineIds, waveId) => existing.push({ waveId, lineIds }));

    // New waves: each line is paired with the ready lines of this run that
    // share its group values; each group fills waves in transfer then move
    // order until a limit stops it. A line with no match gets a wave alone,
    // and so does a line with no contact or country when the type groups by it.
    const candidates = remaining.filter((line) => line.pickingState === PICKING_STATE.ASSIGNED);
    const matches = (line: AutoWaveLine, other: AutoWaveLine) =>
      line.id !== other.id &&
      (!type.batchGroupByPartner || (other.partnerKey !== null && line.partnerKey === other.partnerKey)) &&
      (!type.batchGroupByDestination || (other.countryKey !== null && line.countryKey === other.countryKey)) &&
      (!type.batchGroupBySrcLoc || line.locationId === other.locationId) &&
      (!type.batchGroupByDestLoc || line.locationDestId === other.locationDestId) &&
      (!type.waveGroupByProduct || line.productId === other.productId) &&
      (!type.waveGroupByCategory || line.categoryId === other.categoryId) &&
      (!type.waveGroupByLocation || nearest(type, line.locationId) === nearest(type, other.locationId));
    const groups = new Map<AutoWaveLine, AutoWaveLine[]>();
    const matched = new Set<string>();
    const alone: AutoWaveLine[] = [];

    for (const line of remaining) {
      if (matched.has(line.id)) {
        continue;
      }
      const partners = candidates.filter((other) => matches(line, other));

      if (partners.length === 0) {
        alone.push(line);
        continue;
      }
      groups.set(line, partners);
      partners.forEach((other) => matched.add(other.id));
    }
    for (const [line, partners] of groups) {
      if (assigned.has(line.id)) {
        continue;
      }
      let group = [...partners, line].filter((entry) => !assigned.has(entry.id)).sort(creationOrder);

      while (group.length > 0) {
        const moves = new Set<string>();
        const pickings = new Set<string>();
        const taken: AutoWaveLine[] = [];

        for (const entry of group) {
          moves.add(entry.moveId);
          pickings.add(entry.pickingId);
          if (!fits(type, moves.size, pickings.size)) {
            break;
          }
          taken.push(entry);
        }
        // A negative limit takes nothing: stop rather than loop.
        if (taken.length === 0) {
          break;
        }
        taken.forEach((entry) => assigned.add(entry.id));
        created.push({ pickingTypeId: typeId, description: description(type, line), lineIds: taken.map((entry) => entry.id) });
        group = group.filter((entry) => !assigned.has(entry.id));
      }
    }
    for (const line of alone) {
      if (assigned.has(line.id)) {
        continue;
      }
      assigned.add(line.id);
      created.push({ pickingTypeId: typeId, description: description(type, line), lineIds: [line.id] });
    }
  }
  return { existing, created };
};
