import { type RoutesReportOrderpoint } from 'src/stock/utils/types/routes-report-orderpoint.type';
import { type RoutesReportPutaway } from 'src/stock/utils/types/routes-report-putaway.type';

export type RoutesReportHeader = { putaway: RoutesReportPutaway[]; orderpoint: RoutesReportOrderpoint[] };
