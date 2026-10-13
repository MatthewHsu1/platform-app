import { type AutoprintPicking } from 'src/stock/printing/types/autoprint-picking.type';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';

// What the Validate prints read and make; the hooks take them so their failure rules can be tested.
export type AutoprintDeps = {
  hasPersonToken: () => boolean;
  readAutoprintPickings: (pickingIds: string[]) => Promise<AutoprintPicking[]>;
  createPrintPass: (input: {
    report: string;
    objectSingular: string;
    recordIds: string[];
    options: Record<string, unknown>;
    timeZone: string;
  }) => Promise<{ link: PrintLink } | null>;
  // The transfers whose operation type opens the reception report, and those types' warehouses.
  readReceptionFlags: (pickingIds: string[]) => Promise<{ pickingIds: string[]; warehouseIds: string[] }>;
  readReceptionMoves: (pickingIds: string[]) => Promise<ReceptionMove[]>;
  readWarehouseLocationIds: (warehouseIds: string[]) => Promise<Set<string>>;
};
