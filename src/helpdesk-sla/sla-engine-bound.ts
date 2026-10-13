import { makeSlaEngine } from 'src/helpdesk-sla/sla-engine';
import { TWENTY_SLA_API } from 'src/helpdesk-sla/twenty-sla-api';

// The engine on Twenty: the case trigger, the Refresh SLA button and Duplicate use these.
export const { attachSlas, recomputeSlaRows, refreshCaseSlaSummary } = makeSlaEngine(TWENTY_SLA_API);
