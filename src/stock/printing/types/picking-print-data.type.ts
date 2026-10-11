import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';

// One transfer as its printouts show it. Addresses are already written out; a
// contact with no address of its own shows its company's.
export type PickingPrintData = {
  id: string;
  name: string;
  origin: string;
  state: string;
  pickingTypeCode: 'INCOMING' | 'OUTGOING' | 'INTERNAL';
  scheduledDate: string | null;
  dateDone: string | null;
  partnerName: string;
  partnerAddress: string;
  responsibleName: string;
  note: string;
  warningText: string;
  warehouseName: string;
  warehouseAddress: string;
  sourceWarehouseAddress: string;
  moves: PickingPrintMove[];
  // Open backorders: what is still to deliver.
  backorderMoves: PickingPrintBackorderMove[];
  // Every backorder down the chain, done or not, with lines: what was ordered with this transfer.
  backorderChainMoves: PickingPrintBackorderMove[];
  signaturePng: Uint8Array | null;
};
