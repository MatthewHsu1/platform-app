import { holdsSalesAdministrator } from 'src/crm/settings/utils/holds-sales-administrator.util';
import { readCallerAccess } from 'src/roles/read-caller-access';

export const isSalesAdministrator = async () => holdsSalesAdministrator(await readCallerAccess());
