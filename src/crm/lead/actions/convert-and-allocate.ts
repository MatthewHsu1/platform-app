import { twentyConvertApi } from 'src/crm/lead/actions/convert-api';
import { makeConvertAndAllocate } from 'src/crm/lead/actions/make-convert-and-allocate';

export const convertAndAllocate = makeConvertAndAllocate(twentyConvertApi);
