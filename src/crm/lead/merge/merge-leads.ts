import { makeMergeLeads } from 'src/crm/lead/merge/make-merge-leads';
import { twentyMergeApi } from 'src/crm/lead/merge/merge-api';

export const mergeLeads = makeMergeLeads(twentyMergeApi);
