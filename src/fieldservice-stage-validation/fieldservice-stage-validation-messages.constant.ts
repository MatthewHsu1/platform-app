// The English source of the notes and refusals. Triggers and routes translate them; the texts are listed for the
// translation extractor in src/fieldservice/actions/complete-order.front-component.tsx.
export const STAGE_VALIDATION_MESSAGES = {
  fieldMissing: 'Cannot move to stage {stage} until the {field} field is set.',
  fieldsLeftOut: 'These fields cannot be checked and were left out: {fields}.',
} as const;
