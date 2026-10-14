import { records } from 'src/shared/triggers/records';

export const fsmOrders = records('fsmOrder', 'fsmOrders');
export const fsmLocations = records('fsmLocation', 'fsmLocations');
export const fsmEquipments = records('fsmEquipment', 'fsmEquipments');
export const fsmPersons = records('fsmPerson', 'fsmPersons');
export const fsmTeams = records('fsmTeam', 'fsmTeams');
export const fsmOrderTypes = records('fsmOrderType', 'fsmOrderTypes');
export const fsmTemplates = records('fsmTemplate', 'fsmTemplates');
export const fsmLocationPersons = records('fsmLocationPerson', 'fsmLocationPersons');
export const fsmEquipmentFsmOrderRels = records('fsmEquipmentFsmOrderRel', 'fsmEquipmentFsmOrderRels');
export const fsmOrderFsmPersonRels = records('fsmOrderFsmPersonRel', 'fsmOrderFsmPersonRels');
export const fsmPersonResTerritoryRels = records('fsmPersonResTerritoryRel', 'fsmPersonResTerritoryRels');
export const resRegions = records('resRegion', 'resRegions');
export const resDistricts = records('resDistrict', 'resDistricts');
export const resBranches = records('resBranch', 'resBranches');
export const resTerritories = records('resTerritory', 'resTerritories');
