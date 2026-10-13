import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { ADMIN_ROLE_UNIVERSAL_IDENTIFIER } from 'src/roles/constants/admin-role-universal-identifier.constant';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type MixTable } from 'src/roles/types/mix-table.type';
import { type RoleModule } from 'src/roles/types/role-module.type';
import { type RoleSyncApi } from 'src/roles/types/role-sync-api.type';
import { type RoleSyncRequest } from 'src/roles/types/role-sync-request.type';
import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';
import { type SnapshotRole } from 'src/roles/types/snapshot-role.type';
import { buildRowAccessConfig } from 'src/roles/utils/build-row-access-config.util';
import { closeBlocks } from 'src/roles/utils/close-blocks.util';
import { mixBlocks } from 'src/roles/utils/mix-blocks.util';
import { mixedRoleId } from 'src/roles/utils/mixed-role-id.util';
import { mixedRoleSettings, planRoleRebuild } from 'src/roles/utils/plan-role-rebuild.util';
import { canonicalMixTable, isSameMixTable, verifyMixTable } from 'src/roles/utils/verify-mix-table.util';

const holdersOf = (roles: SnapshotRole[], roleId: string) => roles.find((role) => role.id === roleId)?.memberIds ?? [];

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const normalisedJson = (value: string | null) => {
  try {
    return value === null ? null : JSON.stringify(JSON.parse(value));
  } catch {
    return null;
  }
};

// One idempotent pass: make the saved person's mix if missing, rebuild every mixed role from today's
// blocks, give the person their role, delete roles nobody holds, then write the row rules and the
// mix table where they differ. Only roles whose id is derived from their blocks are written, and
// never the workspace default role or Admin: Twenty refuses an app's writes on the default role,
// and an admin may have made a mixed role the default. A role Twenty refuses to change is
// reported and the run goes on, so one bad role does not stop every later sync; its row rules are
// left out until it is in line. A refused assignment, or a new role that could not be set up,
// still lets the unused-role step remove a role this run made, then the refusal is passed on.
export const runRoleSync = async ({
  api,
  request,
  blocks = BUILDING_BLOCKS,
  modules = ROLE_MODULES,
}: {
  api: RoleSyncApi;
  request: RoleSyncRequest;
  blocks?: BuildingBlock[];
  modules?: RoleModule[];
}): Promise<RoleSyncResult> => {
  const result: RoleSyncResult = { created: [], updated: [], assignedRoleId: null, deleted: [], failed: [], rowAccessWritten: false, warnings: [] };
  const errorByRoleId = new Map<string, unknown>();
  const fail = (roleId: string, warning: string, error: unknown) => {
    errorByRoleId.set(roleId, error);
    result.failed.push({ roleId, message: messageOf(error) });
    result.warnings.push(`${warning}: ${messageOf(error)}`);
  };
  let snapshot = await api.readSnapshot();
  const platformObjects = new Set(snapshot.platformObjectUniversalIdentifiers);
  const mix = (keys: string[]) => mixBlocks(keys, blocks, modules, platformObjects);
  const rawTable = await api.readMixTable();
  const { table: verified, ignoredRoleIds } = verifyMixTable({ raw: rawTable, workspaceId: snapshot.workspaceId, blocks });

  for (const roleId of ignoredRoleIds) {
    result.warnings.push(`Roles: the mix table entry for role ${roleId} does not match its building blocks or names a block this version does not have, and was ignored.`);
  }

  const isLeftAsItIs = (role: SnapshotRole) => role.id === snapshot.defaultRoleId || role.universalIdentifier === ADMIN_ROLE_UNIVERSAL_IDENTIFIER;

  const table: MixTable = {
    version: 1,
    roles: Object.fromEntries(Object.entries(verified.roles).filter(([roleId]) => snapshot.roles.some((role) => role.id === roleId))),
  };
  let targetRoleId: string | null = null;

  if (request.kind === 'save') {
    const closedKeys = closeBlocks(request.blockKeys, blocks);

    if (closedKeys.every((key) => key === BLOCK_KEYS.employee)) {
      targetRoleId = snapshot.defaultRoleId;
    } else {
      targetRoleId = mixedRoleId(snapshot.workspaceId, closedKeys);

      if (!snapshot.roles.some((role) => role.id === targetRoleId)) {
        await api.createRole({ id: targetRoleId, settings: mixedRoleSettings(mix(closedKeys)) });
        result.created.push(targetRoleId);
        snapshot = await api.readSnapshot();
      }
      table.roles[targetRoleId] = closedKeys;
    }
  }

  for (const [roleId, keys] of Object.entries(table.roles)) {
    const role = snapshot.roles.find((candidate) => candidate.id === roleId);

    if (role === undefined) {
      continue;
    }
    if (isLeftAsItIs(role)) {
      result.warnings.push(
        role.id === snapshot.defaultRoleId
          ? `Roles: the default role "${role.label}" is a mixed role, so Platform leaves it as it is; change the default role in Settings.`
          : `Roles: the mix table names Twenty's Admin role "${role.label}"; Platform leaves it as it is.`,
      );
      continue;
    }
    const writes = planRoleRebuild({
      definition: mix(keys),
      role,
      objectIdByUniversalIdentifier: snapshot.objectIdByUniversalIdentifier,
      fieldIdByUniversalIdentifier: snapshot.fieldIdByUniversalIdentifier,
      platformObjectUniversalIdentifiers: snapshot.platformObjectUniversalIdentifiers,
    });

    try {
      for (const write of writes) {
        await api.applyWrite(write);
      }
    } catch (error) {
      fail(roleId, `Roles: role "${role.label}" could not be brought in line with its building blocks`, error);
      continue;
    }
    if (writes.length > 0 && !result.created.includes(roleId)) {
      result.updated.push(roleId);
    }
  }

  const targetError = targetRoleId === null ? undefined : errorByRoleId.get(targetRoleId);
  let assignmentError: unknown = targetError ?? null;

  if (request.kind === 'save' && targetRoleId !== null && targetError === undefined && !holdersOf(snapshot.roles, targetRoleId).includes(request.workspaceMemberId)) {
    try {
      await api.assignRole(request.workspaceMemberId, targetRoleId);
      result.assignedRoleId = targetRoleId;
    } catch (error) {
      assignmentError = error;
    }
  }

  const movedMemberId = result.assignedRoleId === null || request.kind !== 'save' ? null : request.workspaceMemberId;
  const rebuildFailed = new Set(errorByRoleId.keys());
  const unused = Object.keys(table.roles).filter(
    (roleId) =>
      roleId !== result.assignedRoleId &&
      !snapshot.roles.some((role) => role.id === roleId && isLeftAsItIs(role)) &&
      holdersOf(snapshot.roles, roleId).filter((memberId) => memberId !== movedMemberId).length === 0,
  );

  if (unused.length > 0) {
    // Read the holders again right before deleting: a role deleted while someone holds it puts that
    // person on the default role.
    const fresh = await api.readSnapshot();

    for (const roleId of unused) {
      const role = fresh.roles.find((candidate) => candidate.id === roleId);

      if (role === undefined) {
        delete table.roles[roleId];
      } else if (role.memberIds.length === 0) {
        try {
          await api.deleteRole(roleId);
          result.deleted.push(roleId);
          delete table.roles[roleId];
        } catch (error) {
          fail(roleId, `Roles: role "${role.label}" is held by nobody but could not be deleted`, error);
        }
      }
    }
  }

  const config = buildRowAccessConfig({
    mixedRoles: Object.entries(table.roles)
      .filter(([roleId]) => !rebuildFailed.has(roleId))
      .map(([roleId, keys]) => ({ roleId, rowRules: mix(keys).rowRules })),
    modules,
  });
  const configJson = JSON.stringify(config);

  if (normalisedJson(await api.readRowAccessConfig()) !== configJson) {
    await api.writeRowAccessConfig(configJson);
    result.rowAccessWritten = true;
  }

  const finalTable = canonicalMixTable(table);

  if (!isSameMixTable(rawTable, finalTable)) {
    await api.writeMixTable(finalTable);
  }

  if (assignmentError !== null) {
    throw assignmentError;
  }

  return result;
};
