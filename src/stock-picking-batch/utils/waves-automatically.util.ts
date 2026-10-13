// An operation type waves its ready lines on its own when automatic batches
// are on and it groups waves by product, category or location.
export const wavesAutomatically = (type: {
  autoBatch: boolean;
  waveGroupByProduct: boolean;
  waveGroupByCategory: boolean;
  waveGroupByLocation: boolean;
}) => type.autoBatch && (type.waveGroupByProduct || type.waveGroupByCategory || type.waveGroupByLocation);
