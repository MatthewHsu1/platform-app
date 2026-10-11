import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type PickingPrintOpenPackage } from 'src/stock/printing/types/picking-print-open-package.type';
import { type PickingPrintPackageHistory } from 'src/stock/printing/types/picking-print-package-history.type';

// One transfer as its printouts show it. Addresses are already written out; a person, who has no
// address of their own, shows their company's.
export type PickingPrintData = {
  id: string;
  name: string;
  origin: string;
  state: string;
  pickingTypeCode: 'INCOMING' | 'OUTGOING' | 'INTERNAL';
  scheduledDate: string | null;
  dateDone: string | null;
  // The transfer's contact, else the first move's.
  partnerName: string;
  // Whether the transfer has a contact of its own (the partner above is not the first move's).
  hasTransferPartner: boolean;
  partnerAddress: string;
  // The company a person contact belongs to; empty when the contact is a company or a person of none.
  commercialPartnerName: string;
  commercialPartnerAddress: string;
  // The first move's contact, else the transfer's: where a delivery goes.
  deliveryPartnerName: string;
  deliveryPartnerAddress: string;
  responsibleName: string;
  note: string;
  warningText: string;
  warehouseName: string;
  warehouseAddress: string;
  sourceWarehouseAddress: string;
  unitDigits: number;
  moves: PickingPrintMove[];
  // Every backorder down the chain, in any state.
  backorderMoves: PickingPrintBackorderMove[];
  packageHistories: PickingPrintPackageHistory[];
  openPackages: PickingPrintOpenPackage[];
  signaturePng: Uint8Array | null;
  signatureFailed: boolean;
};
