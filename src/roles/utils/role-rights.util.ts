import { type Rights } from 'src/roles/types/rights.type';

export const rightsToPermission = (objectUniversalIdentifier: string, rights: Rights) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: rights !== '-',
  canUpdateObjectRecords: rights === 'RU' || rights === 'RUD',
  canSoftDeleteObjectRecords: rights === 'RUD',
  canDestroyObjectRecords: rights === 'RUD',
});

// Removing a link row is an edit of the field that owns the link, so whoever may edit that field
// may also delete the row.
export const linkRights = (ownerRights: Rights): Rights => (ownerRights === 'RU' ? 'RUD' : ownerRights);
