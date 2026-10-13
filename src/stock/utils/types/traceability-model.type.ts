// What the report starts from. Lines of a lot are never unfolded: they already
// are every move of the lot.
export type TraceabilityModel = 'stockLot' | 'stockPicking' | 'stockMoveLine';
