import { NoPersonBehindRequestError } from 'src/roles/no-person-behind-request.error';
import { readCallerAccess } from 'src/roles/read-caller-access';

// Running a full rebuild of the scoring counts is for workspace
// administrators only, not for sales managers. A request with nobody signed
// in (an API key) is not one.
export const isWorkspaceAdmin = async () => {
  const access = await readCallerAccess().catch((error: unknown) => {
    if (error instanceof NoPersonBehindRequestError) {
      return null;
    }
    throw error;
  });

  return access?.isWorkspaceAdmin === true;
};
