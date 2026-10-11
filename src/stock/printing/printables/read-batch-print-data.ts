import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockPickingBatches } from 'src/stock-picking-batch/stock-picking-batch-records';
import { findInOrder } from 'src/stock/printing/printables/read-package-print-data';
import { type BatchPrintData } from 'src/stock/printing/types/batch-print-data.type';
import { orderMoveLines } from 'src/stock/printing/utils/picking-print-data.util';
import { PRIORITY } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockPickings } from 'src/stock/stock-records';

type FullName = { firstName: string | null; lastName: string | null } | null;
type BatchRow = { id: string; name: string | null; responsible: { name: FullName } | null };
type PickingRow = {
  id: string;
  batchId: string | null;
  name: string | null;
  state: string;
  priority: string | null;
  scheduledDate: string | null;
  createdAt: string;
  batchSequence: number | null;
};
type LineRow = {
  id: string;
  createdAt: string;
  pickingId: string | null;
  productId: string;
  quantity: number | null;
  product: { name: string | null; barcode: string | null; createdAt: string } | null;
  productUom: { name: string | null } | null;
  lot: { name: string | null } | null;
  package: { name: string | null } | null;
  resultPackage: { name: string | null } | null;
  location: { completeName: string | null } | null;
  locationDest: { completeName: string | null } | null;
};

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const LINE_SELECTION = `id createdAt pickingId productId quantity product { deletedAt name barcode createdAt } productUom { deletedAt name }
  lot { deletedAt name } package { deletedAt name } resultPackage { deletedAt name }
  location { deletedAt completeName } locationDest { deletedAt completeName }`;

const text = (value: string | null | undefined) => value ?? '';
const fullName = (name: FullName) => [name?.firstName, name?.lastName].filter(Boolean).join(' ');
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// Transfers as their list orders them: urgent first, then by scheduled date, then the newest.
const byTransferOrder = (left: PickingRow, right: PickingRow) =>
  (left.priority === PRIORITY.URGENT ? 0 : 1) - (right.priority === PRIORITY.URGENT ? 0 : 1) ||
  compareText(left.scheduledDate ?? '￿', right.scheduledDate ?? '￿') ||
  compareText(right.createdAt, left.createdAt);

// The batches with their transfers and the lines of those transfers. Within a source and
// destination, lines come by product, oldest product first. Read as the app: the print page has
// no user.
export const readBatchPrintData = async (batchIds: string[]): Promise<BatchPrintData[]> => {
  const batches = await findInOrder<BatchRow>(stockPickingBatches, batchIds, 'id name responsible { deletedAt name { firstName lastName } }');
  const pickings = (
    await readInChunks(
      batches.map((batch) => batch.id),
      (part) =>
        stockPickings.find<PickingRow>({ batchId: { in: part } }, 'id batchId name state priority scheduledDate createdAt batchSequence'),
    )
  ).sort(byTransferOrder);
  const lines = await readInChunks(
    pickings.map((picking) => picking.id),
    (part) => stockMoveLines.find<LineRow>({ pickingId: { in: part } }, LINE_SELECTION),
  );
  const productRank = (line: LineRow) => text(line.product?.createdAt);

  return batches.map((batch) => {
    const ofBatch = pickings.filter((picking) => picking.batchId === batch.id);
    const pickingName = new Map(ofBatch.map((picking) => [picking.id, text(picking.name)]));
    const ordered = ofBatch.flatMap((picking) =>
      orderMoveLines(
        lines
          .filter((line) => line.pickingId === picking.id)
          .map((line) => ({ ...line, resultPackageName: text(line.resultPackage?.name) })),
      ),
    );

    return {
      name: text(batch.name),
      responsibleName: batch.responsible === null ? '' : fullName(batch.responsible.name),
      pickings: ofBatch.map((picking) => ({
        name: text(picking.name),
        state: picking.state,
        scheduledDate: picking.scheduledDate,
        batchSequence: picking.batchSequence ?? 0,
      })),
      lines: [...ordered]
        .sort((left, right) => compareText(productRank(left), productRank(right)) || compareText(left.productId, right.productId))
        .map((line) => ({
          productId: line.productId,
          productName: text(line.product?.name),
          productBarcode: text(line.product?.barcode),
          quantity: line.quantity ?? 0,
          uomName: text(line.productUom?.name),
          pickingName: pickingName.get(line.pickingId ?? '') ?? '',
          lotName: text(line.lot?.name),
          packageName: text(line.package?.name),
          resultPackageName: line.resultPackageName,
          locationName: text(line.location?.completeName),
          locationDestName: text(line.locationDest?.completeName),
        })),
    };
  });
};
