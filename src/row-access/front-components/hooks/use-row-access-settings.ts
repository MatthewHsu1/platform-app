import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ROW_ACCESS_CONFIG_VARIABLE_KEY } from 'src/row-access/constants/row-access-config-variable-key.constant';
import {
  type MetadataObject,
  type MetadataRole,
} from 'src/row-access/types/metadata-object.type';
import {
  type OwnerCandidateObject,
  type RuleObject,
} from 'src/row-access/types/owner-candidate-object.type';
import { type RowAccessConfig } from 'src/row-access/types/row-access-config.type';
import {
  listOwnerCandidateObjects,
  listRuleObjects,
} from 'src/row-access/utils/list-owner-candidate-objects.util';
import { parseRowAccessConfig } from 'src/row-access/utils/parse-row-access-config.util';

export type RowAccessSettingsData = {
  applicationId: string;
  savedConfig: RowAccessConfig;
  savedConfigProblem: string | undefined;
  candidateObjects: OwnerCandidateObject[];
  ruleObjects: RuleObject[];
  roles: MetadataRole[];
};

export type RowAccessSettingsState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: RowAccessSettingsData };

const LOAD_ERROR_MESSAGE =
  'Could not load the row access settings. You need the Applications and Roles permissions.';

// Each call runs with the signed-in user's role intersected with Platform's
// role. findOneApplication on Platform itself and updateOneApplicationVariable
// need APPLICATIONS, getRoles needs ROLES, objects needs metadata read.
// An application token reaches only its own application, so the page asks
// for nothing outside Platform.
const loadRowAccessSettings = async (): Promise<RowAccessSettingsData> => {
  const client = new MetadataApiClient();

  const applicationResult = await client.query({
    findOneApplication: {
      __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
      id: true,
      applicationVariables: { key: true, value: true },
    },
  });

  const applicationId = applicationResult.findOneApplication?.id;

  if (typeof applicationId !== 'string' || applicationId === '') {
    throw new Error('No application id');
  }

  const [objectsResult, rolesResult, workspaceResult] = await Promise.all([
    client.query({
      objects: {
        __args: { paging: { first: 1000 }, filter: {} },
        edges: {
          node: {
            id: true,
            universalIdentifier: true,
            applicationId: true,
            nameSingular: true,
            labelSingular: true,
            isSystem: true,
            isActive: true,
            fieldsList: {
              id: true,
              name: true,
              label: true,
              type: true,
              isActive: true,
              relation: {
                type: true,
                targetObjectMetadata: { nameSingular: true },
              },
            },
          },
        },
      },
    }),
    client.query({ getRoles: { id: true, label: true } }),
    client.query({
      currentWorkspace: { workspaceCustomApplicationId: true },
    }),
  ]);

  const storedValue =
    applicationResult.findOneApplication?.applicationVariables?.find(
      (variable) => variable.key === ROW_ACCESS_CONFIG_VARIABLE_KEY,
    )?.value;

  const { config, problem } = parseRowAccessConfig(storedValue);

  const objects = (objectsResult.objects?.edges ?? []).map(
    (edge) => edge.node as unknown as MetadataObject,
  );
  const workspaceCustomApplicationId =
    workspaceResult.currentWorkspace?.workspaceCustomApplicationId ??
    undefined;

  return {
    applicationId,
    savedConfig: config,
    savedConfigProblem: problem,
    candidateObjects: listOwnerCandidateObjects(
      objects,
      workspaceCustomApplicationId,
      [applicationId],
    ),
    ruleObjects: listRuleObjects(
      objects,
      workspaceCustomApplicationId,
      [applicationId],
    ),
    roles: (rolesResult.getRoles ?? []).map((role) => ({
      id: role.id,
      label: role.label,
    })),
  };
};

export const saveRowAccessConfig = async ({
  applicationId,
  config,
}: {
  applicationId: string;
  config: RowAccessConfig;
}): Promise<boolean> => {
  try {
    const client = new MetadataApiClient();

    await client.mutation({
      updateOneApplicationVariable: {
        __args: {
          key: ROW_ACCESS_CONFIG_VARIABLE_KEY,
          value: JSON.stringify(config),
          applicationId,
        },
      },
    });

    return true;
  } catch {
    return false;
  }
};

export const useRowAccessSettings = (): RowAccessSettingsState => {
  const [state, setState] = useState<RowAccessSettingsState>({
    kind: 'loading',
  });

  useEffect(() => {
    let isCancelled = false;

    loadRowAccessSettings()
      .then((data) => {
        if (!isCancelled) {
          setState({ kind: 'ready', data });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setState({ kind: 'error', message: LOAD_ERROR_MESSAGE });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
};
