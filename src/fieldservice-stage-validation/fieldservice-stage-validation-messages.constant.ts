// The English source of the note and the button refusal. Triggers and routes translate them; the text is listed
// for the translation extractor in src/fieldservice/actions/complete-order.front-component.tsx.
export const STAGE_VALIDATION_MESSAGES = {
  fieldMissing: 'Cannot move to stage {stage} until the {field} field is set.',
} as const;
