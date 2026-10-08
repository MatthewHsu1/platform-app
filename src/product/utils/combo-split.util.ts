import { floatRound } from 'src/shared/utils/float-round.util';

export const comboBasePrice = (itemPrices: number[]) => (itemPrices.length === 0 ? 0 : Math.min(...itemPrices));

export const comboSplit = ({
  comboPrice,
  choices,
  decimals = 2,
}: {
  comboPrice: number;
  choices: { id: string; basePrice: number }[];
  decimals?: number;
}) => {
  if (choices.length === 0) {
    throw new Error('A combo product needs at least one combo choice.');
  }
  const roundMoney = (amount: number) => floatRound(amount, 10 ** -decimals, 'HALF-UP');
  const total = choices.reduce((sum, choice) => sum + choice.basePrice, 0);
  const shares = choices.map((choice) =>
    roundMoney(total === 0 ? comboPrice / choices.length : (choice.basePrice * comboPrice) / total),
  );
  const rest = roundMoney(comboPrice - shares.reduce((sum, share) => sum + share, 0));
  shares[shares.length - 1] = roundMoney(shares[shares.length - 1] + rest);

  return new Map(choices.map((choice, index) => [choice.id, shares[index]]));
};

export const comboItemRefusal = ({
  itemProductType,
  duplicateInChoice,
}: {
  itemProductType: string;
  duplicateInChoice: boolean;
}) => {
  if (itemProductType === 'COMBO') {
    return 'A combo item cannot be a combo product.';
  }
  if (duplicateInChoice) {
    return 'This product is already in this combo choice.';
  }
  return null;
};
