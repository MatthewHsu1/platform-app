import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const QUERY = `{ findOneApplication(universalIdentifier: "${APPLICATION_UNIVERSAL_IDENTIFIER}") { applicationVariables { key value } } }`;

// The values as saved right now, read with the app token. A trigger runs in the worker, whose copy of the
// variables can lag behind a save made a moment ago, so a setting a trigger acts on is read here.
export const readLiveApplicationVariables = async (): Promise<Map<string, string>> => {
  const { findOneApplication } = requireData(
    await twentyMetadata<{ findOneApplication: { applicationVariables: { key: string; value: string | null }[] | null } }>('application', QUERY),
    'Read the saved settings',
  );

  return new Map((findOneApplication.applicationVariables ?? []).map((variable) => [variable.key, variable.value ?? '']));
};
