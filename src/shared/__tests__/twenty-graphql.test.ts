import { describe, expect, it } from 'vitest';

import { GraphqlInputError, requireData } from 'src/shared/twenty-graphql';

describe('requireData', () => {
  it('tells a refused input apart from other failures', () => {
    const refused = {
      errors: [
        {
          message: 'Field "universalIdentifier" is not defined by type "CreateViewInput".',
          extensions: { http: { status: 400 }, code: 'BAD_USER_INPUT', userFriendlyMessage: 'An error occurred.' },
        },
      ],
    };

    expect(() => requireData(refused, 'Create view')).toThrow(GraphqlInputError);
    expect(() => requireData(refused, 'Create view')).toThrow(
      'Create view: Field "universalIdentifier" is not defined by type "CreateViewInput".',
    );
    expect(() => requireData({ errors: [{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }] }, 'Find leads')).not.toThrow(
      GraphqlInputError,
    );
  });

});
