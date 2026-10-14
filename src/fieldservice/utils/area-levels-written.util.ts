import { type AreaChain } from 'src/fieldservice/types/area-chain.type';

// The service area levels a save wrote. Twenty lists no changed fields for a create, so a new row has written
// every level it holds.
export const areaLevelsWritten = (isCreate: boolean, current: AreaChain, updatedFields: ReadonlySet<string>) => ({
  territory: isCreate ? current.territoryId !== null : updatedFields.has('territoryId'),
  branch: isCreate ? current.branchId !== null : updatedFields.has('branchId'),
  district: isCreate ? current.districtId !== null : updatedFields.has('districtId'),
  region: isCreate ? current.regionId !== null : updatedFields.has('regionId'),
});
