import { matchesFilter } from 'src/shared/filter-editor/matches-filter';

// An empty filter matches every case; a filter that cannot be read matches none, so a policy the app cannot
// evaluate never attaches rows by guesswork.
export const policyFilterMatches = (domain: string | null, record: Record<string, unknown>) => {
  if (domain === null || domain.trim() === '') {
    return true;
  }
  try {
    return matchesFilter(JSON.parse(domain), record);
  } catch {
    return false;
  }
};
