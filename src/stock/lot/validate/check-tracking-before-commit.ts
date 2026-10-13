import { translate } from 'src/shared/i18n/translate';
import { distinctIds as ids } from 'src/shared/utils/distinct-ids.util';
import { readLocations } from 'src/stock/location/read-locations';
import { stockLots } from 'src/stock/lot/lot-records';
import { readValidateLines } from 'src/stock/lot/validate/read-validate-lines';
import { readPackageValidateData } from 'src/stock/package/validate/package-validate-data';
import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { checkNewLotNames, checkSerialAssigned } from 'src/stock/utils/check-serial-counts.util';
import {
  lotKey,
  lotMissingAtDoneRefusal,
  planLotsAtValidate,
  planSanityLotsMissing,
  selectLinesToBeDone,
} from 'src/stock/utils/plan-lots-at-validate.util';
import { checkPackagesBeforeCommit } from 'src/stock/utils/plan-packages-at-validate.util';
import { type CheckTrackingStore } from 'src/stock/lot/types/check-tracking-store.type';
import { type TrackingStage } from 'src/stock/lot/types/tracking-stage.type';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';
import { type SerialQuant } from 'src/stock/utils/types/serial-quant.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';

type LotRefusals = { beforePackages: TrackingRefusal | null; afterPackages: TrackingRefusal | null };

const NO_LOT_REFUSAL: LotRefusals = { beforePackages: null, afterPackages: null };

// Lots missing on the lines or a new name made twice, which Validate meets before the packages; a serial number
// counted twice in one place, which it meets after them.
const lotRefusalsOf = async (store: CheckTrackingStore, toDo: ValidateLineRow[], digits: number): Promise<LotRefusals> => {
  if (toDo.length === 0) {
    return NO_LOT_REFUSAL;
  }
  const lots = await store.findLots(
    ids(toDo.map((line) => line.productId)),
    ids(toDo.map((line) => line.lotName)),
    ids(toDo.map((line) => line.lotId)),
  );
  const plan = planLotsAtValidate(toDo, new Map(lots.map((lot) => [lotKey(lot.productId, lot.name), lot.id])));

  if (plan.missingProductNames.length > 0) {
    return { beforePackages: lotMissingAtDoneRefusal(plan.missingProductNames), afterPackages: null };
  }

  const serialLines = toDo.filter((line) => line.tracking === PRODUCT_TRACKING.SERIAL);

  if (serialLines.length === 0) {
    return NO_LOT_REFUSAL;
  }
  const duplicateName = checkNewLotNames({ lines: serialLines, lotPlan: plan });

  if (duplicateName !== null) {
    return { beforePackages: duplicateName, afterPackages: null };
  }
  const serialLineIds = new Set(serialLines.map((line) => line.id));
  const quants = await store.readSerialQuants(
    ids([
      ...serialLines.map((line) => line.lotId),
      ...plan.assign.filter((entry) => serialLineIds.has(entry.lineId)).map((entry) => entry.lotId),
    ]),
    ids(serialLines.map((line) => line.productId)),
  );

  const serialAssigned = checkSerialAssigned({
    lines: serialLines,
    lotPlan: plan,
    lotNameById: new Map(lots.map((lot) => [lot.id, lot.name])),
    quants,
    locations: await store.readLocations([
      ...quants.map((quant) => quant.locationId),
      ...serialLines.flatMap((line) => [line.locationId, line.locationDestId, line.moveLocationDestId]),
    ]),
    digits,
  });

  return { beforePackages: null, afterPackages: serialAssigned };
};

const packageRefusalsOf = async (store: CheckTrackingStore, toBeDone: ValidateLineRow[]) => {
  const packageIds = ids(toBeDone.flatMap((line) => [line.packageId, line.resultPackageId]));

  if (packageIds.length === 0) {
    return [];
  }
  const { nodes, packageQuants, locationNames } = await store.readPackageData(
    packageIds,
    toBeDone.map((line) => line.locationDestId),
  );

  return checkPackagesBeforeCommit({ lines: toBeDone, packages: nodes, packageQuants, locationNames });
};

// Validate cannot undo stock it has moved, so the lot and package refusals that would otherwise stop it half-way
// are checked before anything is written. The first one that applies is the answer, in the order Validate meets
// them: with the transfer checks, lots missing on picked lines; with the checks of the lines it commits, lots
// missing there, then a new name made twice, then the packages (containers, a package split over two places),
// then a serial number counted twice in one place. Without a stage, both stages run in that order.
export const makeCheckTrackingBeforeCommit =
  (store: CheckTrackingStore) =>
  async (pickingIds: string[], locale: string, stage?: TrackingStage): Promise<string[]> => {
    const { lines, moves } = await store.readLines(pickingIds);
    const answer = (refusal: TrackingRefusal) => [translate(locale, refusal.message, refusal.values)];

    if (stage !== 'lines') {
      const sanity = planSanityLotsMissing(lines, pickingIds.length > 1);

      if (sanity !== null) {
        return answer(sanity);
      }
    }
    if (stage === 'transfers') {
      return [];
    }

    const digits = store.digits();
    const toBeDone = selectLinesToBeDone({ lines, moves, uoms: await store.uoms(), digits });
    const lotRefusals = await lotRefusalsOf(
      store,
      toBeDone.filter((line) => line.tracking !== PRODUCT_TRACKING.NONE),
      digits,
    );

    if (lotRefusals.beforePackages !== null) {
      return answer(lotRefusals.beforePackages);
    }
    const [packageRefusal] = await packageRefusalsOf(store, toBeDone);

    if (packageRefusal !== undefined) {
      return answer(packageRefusal);
    }
    return lotRefusals.afterPackages === null ? [] : answer(lotRefusals.afterPackages);
  };

export const checkTrackingBeforeCommit = makeCheckTrackingBeforeCommit({
  readLines: readValidateLines,
  findLots: (productIds, names, lotIds) =>
    stockLots.findIncludingDeleted<{ id: string; name: string; productId: string }>(
      { productId: { in: productIds }, or: [{ name: { in: names } }, { id: { in: lotIds } }] },
      'id name productId',
    ),
  readSerialQuants: (lotIds, productIds) =>
    stockQuants.find<SerialQuant>({ lotId: { in: lotIds }, productId: { in: productIds } }, 'productId lotId locationId quantity'),
  readLocations,
  uoms: readResolvedUoms,
  digits: () => readStockSettings().productUnitDigits,
  readPackageData: readPackageValidateData,
});
