import { RestApiClient } from 'twenty-client-sdk/rest';
import { Command, enqueueSnackbar, useRecordId } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';

// A headless button: posts the open attribute value to its route and shows
// the result. Errors are caught so the button never stays dead.
export const makeAttributeValueActionCommand = ({
  routePath,
  successMessage,
  fallbackError,
}: {
  routePath: string;
  successMessage: (result: Record<string, number>) => string;
  fallbackError: string;
}) => {
  const AttributeValueActionCommand = () => {
    const recordId = useRecordId();

    const execute = async () => {
      if (recordId === null) {
        await enqueueSnackbar({ message: 'Open one attribute value first.', variant: 'error' });
        return;
      }

      try {
        const response = await new RestApiClient().post<Record<string, number>>(`/s${routePath}`, {
          attributeValueId: recordId,
        });
        await enqueueSnackbar({ message: successMessage(response), variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, fallbackError), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return AttributeValueActionCommand;
};
