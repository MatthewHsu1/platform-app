import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { clearReferences, destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { type Records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

// What goes with a delete: references emptied first (so no row points at a
// record about to vanish), then dependent rows, then link rows. A record
// another trigger put back meanwhile keeps all of them.
export const applyDeleteRules = async (parents: Records, rules: DeleteRules, deletedIds: string[]) => {
  const ids = await stillDeletedIds(parents, deletedIds);

  if (ids.length === 0) {
    return;
  }
  const errors = errorCollector();

  for (const { of, field } of rules.references) {
    await errors.run(`${of.objectPlural}.${field}`, () => clearReferences(of, field, ids));
  }
  if (rules.cascades.length > 0) {
    await errors.run('cascades', () => cascadeDelete({ parents, parentIds: ids, children: rules.cascades }));
  }
  for (const { of, field } of rules.links) {
    await errors.run(`${of.objectPlural}.${field}`, () => destroyLinksOf(of, field, ids));
  }
  errors.throwIfAny();
};
