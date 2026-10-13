// Universal ids of the working hours module. New ids are random UUID v4 and never change after release.

export const RESOURCE_CALENDAR_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '612637e4-53ee-455b-9a60-d699bf27c602',
  active: 'db264e03-d307-4b06-a889-1387505a4b4e',
  tz: '81e06f88-8b94-4ce5-9ceb-15234d03f3ce',
  hoursPerDay: 'e72284d6-272b-43ad-93f3-c9bdce72f938',
  twoWeeksCalendar: '62f189dd-cc05-4e3f-b187-8410ee83da25',
  seedKey: '7b0a81bf-340c-4ca4-a9e4-9b37211c6e40',
  attendances: '32f11537-e1e8-48ac-a1dd-e4a4e31e7ce6',
  leaves: '7055799d-abc2-4e73-9442-2e5c0bbb3986',
} as const;

export const RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER = '3d309029-952c-430b-9b7d-8f97e1b321dc';

export const RESOURCE_CALENDAR_ATTENDANCE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'c36a22f0-015f-49ff-bd65-c90ddcd6ee5a',
  dayofweek: '1c1e9c54-0ed4-4966-8b09-8a3b3b21fb1f',
  hourFrom: 'c16455e4-1f08-4984-9fca-93a35e655f6e',
  hourTo: 'd6d81292-c31b-48b5-b79a-521dc060db5a',
  dayPeriod: '62bbf9c7-af11-4693-a08c-0cf929ac60c1',
  weekType: '78cac9a8-7c93-4aa8-a432-ad66cda55631',
  sequence: 'f46914d4-096a-48f6-99eb-f98b11ba1a8f',
  calendar: '2cd073bb-220d-4173-a240-2afc6d5ae4b8',
  seedKey: 'b9f2b96a-8278-4fd7-823a-4fa4fd24b9ea',
} as const;

export const RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER = 'aced1244-acec-473d-bbd3-34907c4796a4';

export const RESOURCE_CALENDAR_LEAVES_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '1ec8df96-9723-443d-9a87-715ac608dccc',
  calendar: 'a8dbb606-e6be-4163-8147-6995db3f9267',
  dateFrom: 'c7b2a6de-f87f-45bb-9729-aa86f4dfdfba',
  dateTo: '446927d9-a5df-46e1-b272-275f9c6e3d48',
  timeType: '3e1d6ac7-d2f3-43d4-b3ce-7c88493d84c8',
} as const;

export const RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER = '3a1ec8a7-c130-47a1-bfec-3ecf6fb8aacb';

export const RESOURCE_CALENDARS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = 'f8b453eb-a0fd-4f03-b25c-28a1def89f76';

export const RESOURCE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  calendar: '4fb563c6-361e-410d-b16b-71c024b97e51',
  attendance: '3300533b-0406-4b35-ad8d-091f9b4d1496',
  leaves: 'f299e81b-ed4f-4d4f-b29f-c73715058512',
} as const;
