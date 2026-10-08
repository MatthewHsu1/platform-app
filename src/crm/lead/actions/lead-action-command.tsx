import { RestApiClient } from 'twenty-client-sdk/rest';
import { Command, enqueueSnackbar, useRecordId } from 'twenty-sdk/front-component';
import { describeRouteError } from 'src/shared/describe-route-error';

export const postLeadAction = (routePath: string, body: Record<string, unknown>) =>
  new RestApiClient().post<{ leadId: string }>(`/s${routePath}`, body);

// A headless button: posts the open lead to its route and shows the result.
// Command closes the component only when execute resolves, so errors are
// caught; a thrown one would leave the button dead until the page reloads.
export const makeLeadActionCommand = ({
  routePath,
  successMessage,
  fallbackError,
}: {
  routePath: string;
  successMessage: string;
  fallbackError: string;
}) => {
  const LeadActionCommand = () => {
    const recordId = useRecordId();

    const execute = async () => {
      if (recordId === null) {
        await enqueueSnackbar({ message: 'Open one lead first.', variant: 'error' });
        return;
      }

      try {
        await postLeadAction(routePath, { leadId: recordId });
        await enqueueSnackbar({ message: successMessage, variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, fallbackError), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return LeadActionCommand;
};
