import { resolveTree } from 'src/shared/utils/resolve-tree.util';
import { type PackageTypeSequencePlan } from 'src/stock/utils/types/package-type-sequence-plan.type';

export const PACKAGE_RECURSION_REASON = 'Recursion Detected.';

type PackageNode = { id: string; name: string; parentPackageId: string | null };

// The container's stored name and path are the start; the package and every
// package under it are named again from there. A container that is the
// package itself, or already under it, would close a loop.
export const planPackageSubtree = ({
  root,
  parent,
  descendants,
}: {
  root: PackageNode;
  parent: { id: string; completeName: string; parentPath: string } | null;
  descendants: PackageNode[];
}) => {
  const values = new Map<string, { completeName: string; parentPath: string }>();

  if (parent !== null && (parent.id === root.id || parent.parentPath.split('/').includes(root.id))) {
    return { cycle: true, values };
  }
  const { chains } = resolveTree(
    [{ ...root, parentPackageId: null }, ...descendants].map((node) => ({ ...node, parentId: node.parentPackageId })),
  );

  for (const [id, chain] of chains) {
    const names = chain.map((link) => link.name);
    const ids = chain.map((link) => link.id);

    values.set(id, {
      completeName: (parent === null ? names : [parent.completeName, ...names]).join(' > '),
      parentPath: `${parent === null ? '' : parent.parentPath}${ids.join('/')}/`,
    });
  }
  return { cycle: false, values };
};

const SEQUENCE_PADDING = 7;

// A type's sequence prefix is also its sequence's code. A new type gets a
// sequence only for a code; a changed code renames the type's sequence, or
// makes one when the type has none.
export const planPackageTypeSequence = ({
  operation,
  beforeCode,
  sequenceCode,
  referenceSequenceId,
}: {
  operation: 'created' | 'updated';
  beforeCode: string | null;
  sequenceCode: string | null;
  referenceSequenceId: string | null;
}): PackageTypeSequencePlan => {
  const code = sequenceCode ?? '';
  const changed = operation === 'created' ? code !== '' : (beforeCode ?? '') !== code;

  if (!changed || (operation === 'created' && referenceSequenceId !== null)) {
    return { kind: 'none' };
  }
  const name = `Package Type Sequence ${code}`;

  return referenceSequenceId === null
    ? { kind: 'create', sequence: { name, code, prefix: code, padding: SEQUENCE_PADDING } }
    : { kind: 'update', sequenceId: referenceSequenceId, data: { name, code, prefix: code } };
};
