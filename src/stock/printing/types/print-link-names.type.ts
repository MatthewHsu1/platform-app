import { type MessageDescriptor } from 'twenty-sdk/front-component';

import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';

// The name each print link shows, by report. The translation extractor reads only front-component
// files, so the buttons hand these names to the shared pop-ups.
export type PrintLinkNames = Partial<Record<PrintReportKey, MessageDescriptor>>;
