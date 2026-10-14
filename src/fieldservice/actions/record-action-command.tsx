import { Command, enqueueSnackbar, type MessageDescriptor, t, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { checkSelection } from 'src/shared/front-components/selection-check';

// A headless one-record button: posts the selected record to its route and shows the result. Command closes the
// component only when execute resolves, so errors are caught; a thrown one would leave the button dead until the
// page reloads.
export const makeRecordActionCommand = ({
  routePath,
  successMessage,
  fallbackError,
  body = {},
}: {
  routePath: string;
  successMessage: MessageDescriptor;
  fallbackError: MessageDescriptor;
  body?: Record<string, unknown>;
}) => {
  const RecordActionCommand = () => {
    const recordIds = useSelectedRecordIds();

    const execute = async () => {
      const selectionMessage = checkSelection(recordIds.length, 'one');

      if (selectionMessage !== null) {
        await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
        return;
      }
      try {
        await postAppRoute(routePath, { ...body, recordIds });
        await enqueueSnackbar({ message: t(successMessage), variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(fallbackError)), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return RecordActionCommand;
};
