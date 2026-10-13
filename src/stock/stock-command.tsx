import { Command, enqueueSnackbar, t, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { checkSelection } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

type MessageDescriptor = Exclude<Parameters<typeof t>[0], string>;

// A headless button: posts the selected records to its route and shows the
// result. Errors are caught: a thrown one leaves the button dead until reload.
// Without a success message of its own, it shows the route's `message`, and
// the route's `details` (what was left undone) as a warning beside it.
export const makeStockCommand = ({
  routePath,
  idsName,
  successMessage,
  fallbackError,
  extraBody = {},
}: {
  routePath: string;
  idsName: string;
  successMessage?: MessageDescriptor;
  fallbackError: MessageDescriptor;
  extraBody?: Record<string, unknown>;
}) => {
  const StockCommand = () => {
    const selectedRecordIds = useSelectedRecordIds();

    const execute = async () => {
      const selectionMessage = checkSelection(selectedRecordIds.length, 'many');
      if (selectionMessage !== null) {
        await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
        return;
      }

      try {
        const result = await postAppRoute<{ message?: unknown; details?: unknown }>(routePath, {
          ...extraBody,
          [idsName]: selectedRecordIds,
        });

        if (successMessage !== undefined) {
          await enqueueSnackbar({ message: t(successMessage), variant: 'success' });
          return;
        }
        const message = typeof result.message === 'string' ? result.message : '';
        const details = typeof result.details === 'string' ? result.details : '';

        await enqueueSnackbar(
          details.length === 0
            ? { message, variant: 'success' }
            : { message, variant: 'warning', detailedMessage: details },
        );
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(fallbackError)), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return StockCommand;
};
