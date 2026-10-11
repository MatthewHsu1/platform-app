// What the printed reception report shows: the transfers it was asked for (or why it cannot run),
// then each delivery the goods can go to, with its lines.
export type ReceptionPrintData = {
  reason: string | null;
  docs: { name: string; state: string }[];
  sources: {
    name: string;
    partnerName: string;
    scheduledDate: string | null;
    lines: { productName: string; quantity: number; uomName: string; isAssigned: boolean }[];
  }[];
};
