import { TRACEABILITY_MESSAGES } from 'src/stock/reports/traceability/traceability-messages.constant';
import { type TraceabilityRequest } from 'src/stock/reports/traceability/types/traceability-request.type';
import { StockUserError } from 'src/stock/stock-errors';
import { type TraceabilityModel } from 'src/stock/utils/types/traceability-model.type';

const MODELS: TraceabilityModel[] = ['stockLot', 'stockPicking', 'stockMoveLine'];

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

// `unfoldLineId` asks for one line unfolded; otherwise the report of the record.
export const readTraceabilityRequest = (body: Record<string, unknown>): TraceabilityRequest => {
  if (isId(body.unfoldLineId)) {
    return { kind: 'unfold', lineId: body.unfoldLineId };
  }
  const model = MODELS.find((candidate) => candidate === body.model);

  if (model === undefined || !isId(body.recordId)) {
    throw new StockUserError(TRACEABILITY_MESSAGES.invalidRequest);
  }
  return { kind: 'report', model, recordId: body.recordId };
};
