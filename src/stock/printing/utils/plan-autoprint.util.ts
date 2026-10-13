import { type AutoprintJob } from 'src/stock/printing/types/autoprint-job.type';
import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { lotLabelOptions } from 'src/stock/printing/utils/label-quantities.util';

const WAITING_STATES = ['CONFIRMED', 'PARTIALLY_AVAILABLE', 'WAITING', 'ASSIGNED'];

// Groups in the order each format first appears.
const byFormat = <TFormat extends string>(pickings: AutoprintPicking[], formatOf: (picking: AutoprintPicking) => TFormat) => {
  const groups = new Map<TFormat, AutoprintPicking[]>();

  for (const picking of pickings) {
    groups.set(formatOf(picking), [...(groups.get(formatOf(picking)) ?? []), picking]);
  }
  return [...groups];
};

// What Validate prints, in print order: the slips, the reception report and its labels (never for
// deliveries, and only when the received goods feed further moves), product labels per label
// format, lot labels per lot format for transfers with lots, and the packages sheet for transfers
// whose lines went into packages.
export const planAutoprint = (pickings: AutoprintPicking[]): AutoprintJob[] => {
  const jobs: AutoprintJob[] = [];
  const add = (report: PrintReportKey, selected: AutoprintPicking[], options: Record<string, unknown> = {}) => {
    if (selected.length > 0) {
      jobs.push({ report, pickingIds: selected.map((picking) => picking.id), options });
    }
  };
  const notOutgoing = (picking: AutoprintPicking) => picking.pickingTypeCode !== 'OUTGOING';

  add('deliverySlip', pickings.filter((picking) => picking.autoPrintDeliverySlip));
  add('returnSlip', pickings.filter((picking) => picking.autoPrintReturnSlip));
  add('receptionReport', pickings.filter((picking) => picking.autoPrintReceptionReport && notOutgoing(picking) && picking.hasDestinationMoves));

  const labelPickings = pickings.filter((picking) => picking.autoPrintReceptionReportLabels && notOutgoing(picking));

  if (labelPickings.some((picking) => picking.hasDestinationMoves)) {
    add('receptionReportLabels', labelPickings);
  }
  for (const [format, group] of byFormat(pickings.filter((picking) => picking.autoPrintProductLabels), (picking) => picking.productLabelFormat)) {
    add('productLabels', group, { format, moveQuantity: 'MOVE' });
  }
  for (const [format, group] of byFormat(pickings.filter((picking) => picking.autoPrintLotLabels && picking.hasLots), (picking) => picking.lotLabelFormat)) {
    const { labelQuantity, printFormat } = lotLabelOptions(format);

    add(printFormat === 'ZPL' ? 'lotLabelZpl' : 'lotLabelPdf', group, { labelQuantity });
  }
  add('pickingPackages', pickings.filter((picking) => picking.autoPrintPackages && picking.hasResultPackages));

  return jobs;
};

// After Validate the reception report opens when the received storable goods feed no move yet and
// a delivery of the same warehouse, not fed by any other move, still waits for one of them.
export const receptionAutoShow = ({
  flaggedPickingIds,
  lines,
  candidateOuts,
  warehouseLocationIds,
}: {
  flaggedPickingIds: string[];
  lines: { productId: string; isStorable: boolean; state: string; quantity: number; hasDestinationMoves: boolean }[];
  candidateOuts: { productId: string; state: string; productQty: number; locationId: string; pickingId: string | null; hasOrigins: boolean }[];
  warehouseLocationIds: Set<string>;
}) => {
  const products = new Set(
    lines.filter((line) => line.isStorable && line.state !== 'CANCEL' && line.quantity !== 0 && !line.hasDestinationMoves).map((line) => line.productId),
  );

  return (
    products.size > 0 &&
    candidateOuts.some(
      (out) =>
        WAITING_STATES.includes(out.state) &&
        out.productQty > 0 &&
        warehouseLocationIds.has(out.locationId) &&
        !out.hasOrigins &&
        !(out.pickingId !== null && flaggedPickingIds.includes(out.pickingId)) &&
        products.has(out.productId),
    )
  );
};
