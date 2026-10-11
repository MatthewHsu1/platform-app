import { type RoutesReportHeader } from 'src/stock/utils/types/routes-report-header.type';
import { type RoutesReportLocation } from 'src/stock/utils/types/routes-report-location.type';
import { type RoutesReportRow } from 'src/stock/utils/types/routes-report-row.type';

export type ProductRoutesReport = {
  locations: RoutesReportLocation[];
  headers: Record<string, RoutesReportHeader>;
  rows: RoutesReportRow[];
};
