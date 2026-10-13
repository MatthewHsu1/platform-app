import { FORECAST_MESSAGES } from 'src/stock/reports/forecast/forecast-messages.constant';
import { type ForecastRequest } from 'src/stock/reports/forecast/types/forecast-request.type';
import { StockUserError } from 'src/stock/stock-errors';

const optionalId = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : undefined);

export const readForecastRequest = (body: Record<string, unknown>): ForecastRequest => {
  const request: ForecastRequest = {
    productTemplateId: optionalId(body.productTemplateId),
    productId: optionalId(body.productId),
    moveId: optionalId(body.moveId),
    orderpointId: optionalId(body.orderpointId),
    warehouseId: optionalId(body.warehouseId),
  };

  if (!request.productTemplateId && !request.productId && !request.moveId && !request.orderpointId) {
    throw new StockUserError(FORECAST_MESSAGES.invalidRequest);
  }
  return request;
};
