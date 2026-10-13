import { UserError } from 'src/shared/user-error';

// A refusal of a stock button. The routes answer it like any refusal the user reads.
export class StockUserError extends UserError {
  constructor(...parameters: ConstructorParameters<typeof UserError>) {
    super(...parameters);
    this.name = 'StockUserError';
  }
}
