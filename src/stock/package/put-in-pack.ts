import { randomUUID } from 'node:crypto';

import { findMany } from 'src/shared/triggers/records';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { packLines, packPackages, readHeadedPackages, readOpenLinesInto, resolveTarget, setLineDestination } from 'src/stock/package/pack-into';
import { stockPackages } from 'src/stock/package/package-records';
import { stockPackageTypes } from 'src/stock/routing-records';
import { printPackageLabel } from 'src/stock/package/print-package-label';
import { printTimeZoneOf } from 'src/stock/printing/utils/print-dates.util';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PACKAGE_LABEL_TO_PRINT, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings, stockPickingTypes, uomUoms } from 'src/stock/stock-records';
import { readIds } from 'src/stock/stock-route';
import { PACKAGE_DEST_INSIDE_ITSELF, packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import {
  NOTHING_TO_PACK,
  outermostPackage,
  packageChoiceIds,
  PACK_DESTINATION_NOT_OFFERED,
  PACK_LINES_CLOSED,
  PACK_PICKING_CLOSED,
  PACKAGES_WITHOUT_OPEN_LINES,
  planPutInPack,
  singleOperationType,
} from 'src/stock/utils/plan-put-in-pack.util';
import { type PackageChoice } from 'src/stock/package/types/package-choice.type';
import { type PutInPackRouteResult } from 'src/stock/package/types/put-in-pack-route-result.type';
import { type PackAnswer } from 'src/stock/utils/types/pack-answer.type';
import { type PackLine } from 'src/stock/utils/types/pack-line.type';

const PACKAGE_NOT_FOUND_MESSAGE = 'Package not found.';

type LineRow = {
  id: string;
  pickingId: string | null;
  moveId: string | null;
  productId: string;
  quantity: number | null;
  quantityProductUom: number | null;
  picked: boolean | null;
  state: string;
  resultPackageId: string | null;
  locationDestId: string;
};

type PickingTypeRow = {
  id: string;
  setPackageType: boolean | null;
  autoPrintPackageLabel: boolean | null;
  packageLabelToPrint: string | null;
};

const LINE_SELECTION = 'id pickingId moveId productId quantity quantityProductUom picked state resultPackageId locationDestId';
const CLOSED_PICKING_STATES: string[] = [PICKING_STATE.DRAFT, PICKING_STATE.DONE, PICKING_STATE.CANCEL];
const CLOSED_LINE_STATES: string[] = [MOVE_STATE.DRAFT, MOVE_STATE.DONE, MOVE_STATE.CANCEL];

const textOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

export const readAnswer = (body: Record<string, unknown>): PackAnswer => ({
  packageId: textOf(body.packageId),
  packageTypeId: textOf(body.packageTypeId),
  packageName: textOf(body.packageName),
  fromPackageWizard: body.fromPackageWizard === true,
});

// One id per opening of the pop-up: every call it sends makes at most one new package.
export const readRunId = (body: Record<string, unknown>) => textOf(body.runId) ?? randomUUID();

// The rows the lines point at, read with the app's access once the user may read the lines.
const readLineContext = async (lines: LineRow[]) => {
  const { pickings, moves } = await findMany<{
    pickings: { id: string; pickingTypeId: string | null; locationDestId: string | null }[];
    moves: { id: string; locationDestId: string | null; packagingUomId: string | null }[];
  }>({
    pickings: { of: stockPickings, filter: { id: { in: [...new Set(lines.flatMap((line) => line.pickingId ?? []))] } }, selection: 'id pickingTypeId locationDestId' },
    moves: { of: stockMoves, filter: { id: { in: [...new Set(lines.flatMap((line) => line.moveId ?? []))] } }, selection: 'id locationDestId packagingUomId' },
  });
  const { pickingTypes, units } = await findMany<{
    pickingTypes: PickingTypeRow[];
    units: { id: string; packageTypeId: string | null }[];
  }>({
    pickingTypes: {
      of: stockPickingTypes,
      filter: { id: { in: [...new Set(pickings.flatMap((picking) => picking.pickingTypeId ?? []))] } },
      selection: 'id setPackageType autoPrintPackageLabel packageLabelToPrint',
    },
    units: { of: uomUoms, filter: { id: { in: [...new Set(moves.flatMap((move) => move.packagingUomId ?? []))] } }, selection: 'id packageTypeId' },
  });
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const moveById = new Map(moves.map((move) => [move.id, move]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const pickingOf = (line: { pickingId: string | null }) => (line.pickingId === null ? undefined : pickingById.get(line.pickingId));
  const moveOf = (line: LineRow) => (line.moveId === null ? undefined : moveById.get(line.moveId));

  return {
    pickingOf,
    moveOf,
    pickingTypeIdOf: (line: { pickingId: string | null }) => pickingOf(line)?.pickingTypeId ?? null,
    pickingTypes: new Map(pickingTypes.map((type) => [type.id, type])),
    packagingTypeOf: (line: LineRow) => {
      const unitId = moveOf(line)?.packagingUomId ?? null;
      return unitId === null ? null : (unitById.get(unitId)?.packageTypeId ?? null);
    },
  };
};

const toPackLine = (line: LineRow, context: Awaited<ReturnType<typeof readLineContext>>): PackLine => ({
  id: line.id,
  pickingTypeId: context.pickingTypeIdOf(line),
  state: line.state,
  quantity: line.quantity ?? 0,
  picked: line.picked === true,
  resultPackageId: line.resultPackageId,
  locationDestId: line.locationDestId,
  packagingPackageTypeId: context.packagingTypeOf(line),
});

const singleTypeSetting = (pickingTypeIds: (string | null)[], pickingTypes: Map<string, PickingTypeRow>) => {
  const typeId = singleOperationType(pickingTypeIds);

  return typeId === null ? undefined : pickingTypes.get(typeId);
};

type PackageChoiceRow = { id: string; name: string | null; completeName: string | null; packageTypeId: string | null; locationId: string | null };

// The package types the Put in Pack pop-up offers, by name.
const readPackageTypeChoices = async () => {
  const types = await stockPackageTypes.find<{ id: string; name: string | null }>({}, 'id name');
  const readable = new Set(await filterReadableIds('stockPackageType', 'stockPackageTypes', types.map((type) => type.id)));

  return types
    .filter((type) => readable.has(type.id))
    .map((type) => ({ id: type.id, label: textOrNull(type.name) ?? '' }))
    .sort((left, right) => left.label.localeCompare(right.label));
};

// The existing packages the Put in Pack pop-up offers, read in full with the
// app's access, then cut to those the user can read.
const readPackageChoices = async (
  packedIds: string[],
  locationDestId: string | null,
  headed: { id: string; packageDestId: string | null }[],
): Promise<PackageChoice[]> => {
  const packed = await stockPackages.find<{ id: string; parentPackageId: string | null }>({ id: { in: packedIds } }, 'id parentPackageId');
  const originIds = [...new Set(packed.flatMap((pack) => pack.parentPackageId ?? []))];
  const candidates = await stockPackages.find<PackageChoiceRow>(
    {
      or: [
        locationDestId === null ? { locationId: { is: 'NULL' } } : { locationId: { eq: locationDestId } },
        { locationId: { is: 'NULL' } },
        { id: { in: originIds } },
      ],
    },
    'id name completeName packageTypeId locationId',
  );
  const openLines = await readOpenLinesInto<{ id: string; resultPackageId: string; locationDestId: string }>(
    candidates.filter((pack) => pack.locationId === null).map((pack) => pack.id),
    headed,
    'id resultPackageId locationDestId',
  );
  const offered = packageChoiceIds({ packages: candidates, headed, openLines, packageTypeId: null, locationDestId, originPackageIds: originIds });
  const readable = new Set(await filterReadableIds('stockPackage', 'stockPackages', offered));

  return candidates
    .filter((pack) => readable.has(pack.id))
    .map((pack) => ({ id: pack.id, label: textOrNull(pack.completeName) ?? textOrNull(pack.name) ?? '', packageTypeId: pack.packageTypeId }));
};

const checkAnswerReadable = async (answer: PackAnswer) => {
  if (answer.packageId !== null && (await filterReadableIds('stockPackage', 'stockPackages', [answer.packageId])).length === 0) {
    throw new StockUserError(PACKAGE_NOT_FOUND_MESSAGE);
  }
  if (answer.packageTypeId !== null && (await filterReadableIds('stockPackageType', 'stockPackageTypes', [answer.packageTypeId])).length === 0) {
    throw new StockUserError('Package type not found.');
  }
};

// Packages go into a package: a chosen existing one, else a new one. The
// pop-up is asked from the open lines of the packages and the packages headed into them.
export const putPackagesInPack = async (packageIds: string[], answer: PackAnswer, runId: string): Promise<PutInPackRouteResult> => {
  const readable = await filterReadableIds('stockPackage', 'stockPackages', packageIds);

  if (packageIds.length === 0 || readable.length !== packageIds.length) {
    throw new StockUserError(PACKAGE_NOT_FOUND_MESSAGE);
  }
  const headed = await readHeadedPackages();
  const lines = await readOpenLinesInto<LineRow>(packageIds, headed, LINE_SELECTION);

  if (lines.length === 0) {
    throw new StockUserError(PACKAGES_WITHOUT_OPEN_LINES);
  }
  const context = await readLineContext(lines);
  // The first package's lines come first: the pop-up defaults to where they go.
  const insideFirst = packageDestinationDescendants(packageIds[0], headed);
  const ordered = [...lines].sort(
    (left, right) => Number(!insideFirst.has(left.resultPackageId ?? '')) - Number(!insideFirst.has(right.resultPackageId ?? '')),
  );
  const plan = planPutInPack({
    lines: ordered.map((line) => toPackLine(line, context)),
    explicitPackageIds: packageIds,
    outermostOf: (packageId) => packageId,
    setPackageType: singleTypeSetting(lines.map(context.pickingTypeIdOf), context.pickingTypes)?.setPackageType === true,
    answer,
  });

  if (plan.kind === 'askPackage') {
    return {
      ...plan,
      choices: await readPackageChoices(plan.packageIds, plan.defaultLocationDestId, headed),
      packageTypes: await readPackageTypeChoices(),
    };
  }
  if (plan.kind !== 'packPackages') {
    throw new StockUserError(NOTHING_TO_PACK);
  }
  await checkAnswerReadable(answer);
  if (plan.target.kind === 'existing') {
    const targetId = plan.target.packageId;

    if (plan.packageIds.some((packageId) => packageDestinationDescendants(packageId, headed).has(targetId))) {
      throw new StockUserError(PACKAGE_DEST_INSIDE_ITSELF);
    }
  }
  const packageId = await resolveTarget(plan.target, runId);

  await packPackages(plan.packageIds, packageId);
  return { kind: 'packed', packageId, printouts: [] };
};

const readRequestedLines = async (body: Record<string, unknown>) => {
  const pickingId = textOf(body.pickingId);

  if (pickingId !== null) {
    const [picking] =
      (await filterReadableIds('stockPicking', 'stockPickings', [pickingId])).length === 0
        ? []
        : await stockPickings.find<{ id: string; state: string }>({ id: { eq: pickingId } }, 'id state');

    if (picking === undefined) {
      throw new StockUserError('Transfer not found.');
    }
    if (CLOSED_PICKING_STATES.includes(picking.state)) {
      throw new StockUserError(PACK_PICKING_CLOSED);
    }
    return () => stockMoveLines.find<LineRow>({ pickingId: { eq: pickingId } }, LINE_SELECTION);
  }
  const lineIds = readIds(body, 'lineIds');
  const readable = await filterReadableIds('stockMoveLine', 'stockMoveLines', lineIds);

  if (lineIds.length === 0 || readable.length !== lineIds.length) {
    throw new StockUserError('Select the lines to pack.');
  }
  const lines = await stockMoveLines.find<LineRow>({ id: { in: lineIds } }, LINE_SELECTION);

  if (lines.some((line) => CLOSED_LINE_STATES.includes(line.state))) {
    throw new StockUserError(PACK_LINES_CLOSED);
  }
  return () => stockMoveLines.find<LineRow>({ id: { in: lineIds } }, LINE_SELECTION);
};

// The Package Destination pop-up's answer: the lines to pack all go to one of
// their destinations, then Put in Pack runs again.
const applyDestinationAnswer = async (body: Record<string, unknown>, lines: LineRow[]) => {
  const locationDestId = textOf(body.locationDestId);
  const destinationLineIds = readIds(body, 'destinationLineIds');

  if (locationDestId === null || destinationLineIds.length === 0) {
    return false;
  }
  const chosen = lines.filter((line) => destinationLineIds.includes(line.id));

  if (chosen.length !== destinationLineIds.length || !chosen.some((line) => line.locationDestId === locationDestId)) {
    throw new StockUserError(PACK_DESTINATION_NOT_OFFERED);
  }
  await setLineDestination(
    chosen.filter((line) => line.locationDestId !== locationDestId).map((line) => line.id),
    locationDestId,
  );
  return true;
};

// One line packed alone goes where the putaway rules send its new package.
const putAwaySingleLine = async (line: LineRow, packageId: string, base: string) => {
  const key = `single:${line.id}`;
  const destination = (
    await putawayDestinations([
      {
        key,
        locationDestId: base,
        productId: line.productId,
        quantity: line.quantityProductUom ?? line.quantity ?? 0,
        packageId,
        packagingUomId: null,
        excludedLineIds: [line.id],
      },
    ])
  ).get(key);

  return destination !== undefined && destination !== line.locationDestId ? destination : null;
};

// Put in Pack on a transfer or on selected lines.
export const putLinesInPack = async (body: Record<string, unknown>): Promise<PutInPackRouteResult> => {
  const readLines = await readRequestedLines(body);
  let lines = await readLines();

  if (await applyDestinationAnswer(body, lines)) {
    lines = await readLines();
  }
  const answer = readAnswer(body);
  const context = await readLineContext(lines);
  const headed = await readHeadedPackages();
  const pickingType = singleTypeSetting(lines.map(context.pickingTypeIdOf), context.pickingTypes);
  const plan = planPutInPack({
    lines: lines.map((line) => toPackLine(line, context)),
    explicitPackageIds: [],
    outermostOf: (packageId) => outermostPackage(packageId, headed),
    setPackageType: pickingType?.setPackageType === true,
    answer,
  });

  if (plan.kind === 'refuse') {
    throw new StockUserError(plan.reason);
  }
  if (plan.kind === 'nothing') {
    throw new StockUserError(NOTHING_TO_PACK);
  }
  if (plan.kind === 'askDestination') {
    return plan;
  }
  if (plan.kind === 'askPackage') {
    return {
      ...plan,
      choices: await readPackageChoices(plan.packageIds, plan.defaultLocationDestId, headed),
      packageTypes: await readPackageTypeChoices(),
    };
  }
  const runId = readRunId(body);

  if (plan.kind === 'packPackages') {
    return putPackagesInPack(plan.packageIds, answer, runId);
  }
  await checkAnswerReadable(answer);
  const packageId = await resolveTarget(plan.target, runId);
  const single = plan.singleLine ? lines.find((line) => line.id === plan.lineIds[0]) : undefined;
  const singleDestination =
    single === undefined
      ? null
      : await putAwaySingleLine(
          single,
          packageId,
          context.moveOf(single)?.locationDestId ?? context.pickingOf(single)?.locationDestId ?? single.locationDestId,
        );

  await packLines(plan.lineIds, packageId, singleDestination);
  // The package is made whatever happens to its label.
  const printouts =
    pickingType?.autoPrintPackageLabel === true
      ? await printPackageLabel(
          packageId,
          pickingType.packageLabelToPrint === PACKAGE_LABEL_TO_PRINT.ZPL ? 'ZPL' : 'PDF',
          printTimeZoneOf(body.timeZone),
        ).catch(() => [])
      : [];

  return { kind: 'packed', packageId, printouts };
};
