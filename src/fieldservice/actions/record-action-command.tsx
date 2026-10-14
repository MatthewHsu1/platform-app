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
  afterSuccess,
}: {
  routePath: string;
  successMessage: MessageDescriptor;
  fallbackError: MessageDescriptor;
  body?: Record<string, unknown>;
  // What a button does with the route's answer once the route has succeeded, e.g. open a panel.
  afterSuccess?: (result: unknown, recordIds: string[]) => Promise<void>;
}) => {
  const RecordActionCommand = () => {
    const recordIds = useSelectedRecordIds();

    const execute = async () => {
      const selectionMessage = checkSelection(recordIds.length, 'one');

      if (selectionMessage !== null) {
        await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
        return;
      }
      let result: unknown;

      try {
        result = await postAppRoute<unknown>(routePath, { ...body, recordIds });
        await enqueueSnackbar({ message: t(successMessage), variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(fallbackError)), variant: 'error' });
        return;
      }
      // The route has succeeded and the success shown; a follow-up that fails changes none of that.
      await afterSuccess?.(result, recordIds).catch(() => undefined);
    };

    return <Command execute={execute} />;
  };

  return RecordActionCommand;
};
