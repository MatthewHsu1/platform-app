export const quantName = ({
  productName,
  locationName,
  lotName,
  packageName,
  ownerName,
}: {
  productName: string;
  locationName: string;
  lotName: string | null;
  packageName: string | null;
  ownerName: string | null;
}) => [productName, locationName, lotName, packageName, ownerName].filter((part) => part !== null).join(' - ');
