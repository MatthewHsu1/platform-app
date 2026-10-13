// The English source of the notes and refusals the work case rules write. Routes and triggers
// translate them into the saver's language; the texts are listed for the translation extractor in
// src/helpdesk/actions/assign-to-me.front-component.tsx.
export const HELPDESK_MESSAGES = {
  teamOwnParent: 'A team cannot be its own parent.',
  categoryOwnParent: 'A category cannot be its own parent.',
  stageInUse: 'This stage is used by work cases.',
} as const;
