import { type ActorRow } from 'src/stock/types/actor-row.type';

export type PackageEventRecord = ActorRow & {
  id: string;
  name: string | null;
  parentPackageId: string | null;
  packageDestId: string | null;
  packageTypeId: string | null;
  shippingWeight: number | null;
  locationId: string | null;
};
