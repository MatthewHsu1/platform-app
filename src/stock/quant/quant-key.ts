type QuantKeyParts = {
  productId: string;
  locationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
};

type QuantLine = {
  productId: string;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
};

export const quantKey = ({ productId, locationId, lotId, packageId, ownerId }: QuantKeyParts) =>
  [productId, locationId, lotId ?? '', packageId ?? '', ownerId ?? ''].join('|');

export const parseQuantKey = (key: string): QuantKeyParts => {
  const parts = key.split('|');

  if (parts.length !== 5 || parts[0] === '' || parts[1] === '') {
    throw new Error(`Not a stock key: ${key}`);
  }
  const [productId, locationId, lotId, packageId, ownerId] = parts;

  return {
    productId,
    locationId,
    lotId: lotId === '' ? null : lotId,
    packageId: packageId === '' ? null : packageId,
    ownerId: ownerId === '' ? null : ownerId,
  };
};

export const sourceKeyOf = (line: QuantLine) =>
  quantKey({
    productId: line.productId,
    locationId: line.locationId ?? '',
    lotId: line.lotId ?? null,
    packageId: line.packageId ?? null,
    ownerId: line.ownerId,
  });

export const destinationKeyOf = (line: QuantLine) =>
  quantKey({
    productId: line.productId,
    locationId: line.locationDestId ?? '',
    lotId: line.lotId ?? null,
    packageId: line.resultPackageId ?? null,
    ownerId: line.ownerId,
  });

const equalsOrNull = (value: string | null) => (value === null ? { is: 'NULL' } : { eq: value });

export const lineFilterForKey = (key: string, side: 'source' | 'destination'): Record<string, unknown> => {
  const parts = parseQuantKey(key);

  return {
    productId: { eq: parts.productId },
    [side === 'source' ? 'locationId' : 'locationDestId']: { eq: parts.locationId },
    ownerId: equalsOrNull(parts.ownerId),
    lotId: equalsOrNull(parts.lotId),
    [side === 'source' ? 'packageId' : 'resultPackageId']: equalsOrNull(parts.packageId),
  };
};
