import { registerPrintable } from 'src/stock/printing/printables';
import { readPickingPrintData } from 'src/stock/printing/printables/read-picking-print-data';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { buildDeliverySlip, buildPickingOperations, buildReturnSlip } from 'src/stock/printing/utils/picking-documents.util';

const base = {
  objectSingular: 'stockPicking',
  objectPlural: 'stockPickings',
  read: (recordIds: string[]) => readPickingPrintData(recordIds),
};

// One transfer is named after its contact and reference; several print under the report name.
const nameOf = (report: string) => (data: PickingPrintData[]) =>
  data.length === 1 ? `${report} - ${data[0].partnerName} - ${data[0].name}` : report;

registerPrintable<PickingPrintData>({
  ...base,
  key: 'pickingOperations',
  build: buildPickingOperations,
  fileName: nameOf('Picking Operations'),
});
registerPrintable<PickingPrintData>({ ...base, key: 'deliverySlip', build: buildDeliverySlip, fileName: nameOf('Delivery Slip') });
registerPrintable<PickingPrintData>({ ...base, key: 'returnSlip', build: buildReturnSlip, fileName: () => 'Return slip' });
