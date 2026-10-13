import { isKnownTimeZone } from 'src/resource/utils/time-zone.util';
import { records } from 'src/shared/triggers/records';

const DEFAULT = 'UTC';
const members = records('workspaceMember', 'workspaceMembers');

type MemberZone = { id: string; timeZone: string | null; createdAt: string };

// Twenty stores "system" for "the browser's zone", which says nothing about the zone the person works in.
const knownZone = (zone: string | null) => (zone !== null && isKnownTimeZone(zone) ? zone : null);

// The zone of a person who acts, if it is a real zone name.
export const readMemberTimeZone = async (memberId: string | undefined) => {
  if (memberId === undefined) {
    return null;
  }
  const [member] = await members.find<MemberZone>({ id: { eq: memberId } }, 'id timeZone createdAt');

  return knownZone(member?.timeZone ?? null);
};

// A new working-hours record without a zone takes the acting person's zone, else the earliest member's, else UTC.
export const defaultTimeZone = async ({ actingMemberId }: { actingMemberId: string | undefined }) => {
  const own = await readMemberTimeZone(actingMemberId);

  if (own !== null) {
    return own;
  }
  const every = await members.find<MemberZone>({}, 'id timeZone createdAt');
  const earliest = [...every].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  for (const member of earliest) {
    const zone = knownZone(member.timeZone);

    if (zone !== null) {
      return zone;
    }
  }

  return DEFAULT;
};
