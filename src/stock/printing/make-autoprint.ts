import { type AutoprintDeps } from 'src/stock/printing/types/autoprint-deps.type';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { planAutoprint, receptionAutoShow } from 'src/stock/printing/utils/plan-autoprint.util';

// The prints come after the stock has moved: nothing in them may fail the validation, so a failing
// print is left out and a failing read gives no prints.
export const makeAutoprint = (deps: AutoprintDeps) => {
  // The prints the operation types ask for when these transfers are validated, as one-time links
  // for the user who validated. Only a user's own click gets them: they open only in that user's
  // window, so a run nobody watches (a validation the daily job finishes) makes none.
  const autoprint = async (pickingIds: string[], timeZone: string): Promise<PrintLink[]> => {
    if (pickingIds.length === 0 || !deps.hasPersonToken()) {
      return [];
    }
    const pickings = await deps.readAutoprintPickings(pickingIds).catch(() => null);

    if (pickings === null) {
      return [];
    }
    const links: PrintLink[] = [];

    for (const job of planAutoprint(pickings)) {
      const created = await deps
        .createPrintPass({ report: job.report, objectSingular: 'stockPicking', recordIds: job.pickingIds, options: job.options, timeZone })
        .catch(() => null);

      if (created !== null) {
        links.push(created.link);
      }
    }
    return links;
  };

  const flaggedToShow = async (pickingIds: string[]) => {
    const flags = await deps.readReceptionFlags(pickingIds);

    if (flags.pickingIds.length === 0) {
      return [];
    }
    const [moves, locationIds] = await Promise.all([
      deps.readReceptionMoves(flags.pickingIds),
      deps.readWarehouseLocationIds(flags.warehouseIds),
    ]);
    const flagged = new Set(flags.pickingIds);
    const isFlagged = (pickingId: string | null) => pickingId !== null && flagged.has(pickingId);
    const show = receptionAutoShow({
      flaggedPickingIds: flags.pickingIds,
      lines: moves
        .filter((move) => isFlagged(move.pickingId))
        .map((move) => ({
          productId: move.productId,
          isStorable: move.isStorable,
          state: move.state,
          quantity: move.quantity,
          hasDestinationMoves: move.moveDestIds.length > 0,
        })),
      candidateOuts: moves
        .filter((move) => !isFlagged(move.pickingId))
        .map((move) => ({
          productId: move.productId,
          state: move.state,
          productQty: move.productQty,
          locationId: move.locationId,
          pickingId: move.pickingId,
          hasOrigins: move.moveOrigIds.length > 0,
        })),
      warehouseLocationIds: locationIds,
    });

    return show ? flags.pickingIds : [];
  };

  // The validated receipts whose reception report opens for the user who validated them: their
  // operation type asks for it and a waiting delivery of one of their warehouses can take what came in.
  const receptionReportToShow = async (pickingIds: string[]): Promise<string[]> => {
    if (pickingIds.length === 0 || !deps.hasPersonToken()) {
      return [];
    }
    return flaggedToShow(pickingIds).catch(() => []);
  };

  return { autoprint, receptionReportToShow };
};
