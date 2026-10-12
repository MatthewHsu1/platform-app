import { readCallerAccessOrNull } from 'src/roles/read-caller-access';

// Running a full rebuild of the scoring counts is for workspace
// administrators only, not for sales managers. A request with nobody signed
// in (an API key) is not one.
export const isWorkspaceAdmin = async () => (await readCallerAccessOrNull())?.isWorkspaceAdmin === true;
