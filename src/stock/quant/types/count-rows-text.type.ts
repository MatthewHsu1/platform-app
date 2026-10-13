import { type MessageDescriptor } from 'twenty-sdk/front-component';

// Labels of a stock row in the count pop-ups, with {counted}, {onHand} and {difference} placeholders.
export type CountRowsText = { counted: MessageDescriptor; onHand: MessageDescriptor; difference: MessageDescriptor };
