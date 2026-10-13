// The English source of the notes the working-hours rules write. The triggers translate them into the saver's
// language; the texts are listed for the translation extractor in
// src/helpdesk-sla/actions/refresh-sla.front-component.tsx.
export const RESOURCE_MESSAGES = {
  timeZoneRefusal: 'Choose a known time zone.',
  attendanceOverlap: 'Working hours of one calendar cannot overlap.',
  leaveOrderRefusal: 'The start of the time off must be before its end.',
} as const;
