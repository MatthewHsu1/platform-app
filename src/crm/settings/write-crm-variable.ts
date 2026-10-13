import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

// Writes one of Platform's variables with the app token, which may change its
// own app's variables: the schedule moves its next run.
export const writeCrmVariable = async (key: string, value: string) => {
  requireData(
    await twentyMetadata<{ updateOneApplicationVariable: boolean }>(
      'application',
      'mutation SetVariable($key: String!, $value: String!) { updateOneApplicationVariable(key: $key, value: $value) }',
      { key, value },
    ),
    `Save ${key}`,
  );
};
