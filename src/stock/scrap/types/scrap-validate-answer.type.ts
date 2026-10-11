// What the scrap Validate route answers: done, or the insufficient-quantity question with what the pop-up shows.
export type ScrapValidateAnswer =
  | { kind: 'done' }
  | {
      kind: 'needsAnswer';
      question: 'insufficientQuantity';
      scrapId: string;
      productName: string;
      locationName: string;
      quantity: number;
      unitName: string;
      quants: { locationName: string; quantity: number }[];
    };
