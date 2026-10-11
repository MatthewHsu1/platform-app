import { type PickingPrintOpenPackage } from 'src/stock/printing/types/picking-print-open-package.type';

type ContactCompany = { name: string; address: string };
type Contact = { kind: 'person'; name: string; company: ContactCompany | null } | { kind: 'company'; name: string; address: string };

// Every backorder down the chain of each printed transfer, nearest first, marked when it is a
// backorder of the printed transfer itself.
export const backorderChains = (rootIds: string[], backorders: { id: string; backorderId: string; state: string }[]) => {
  const childrenOf = new Map<string, { id: string; backorderId: string; state: string }[]>();

  for (const backorder of backorders) {
    childrenOf.set(backorder.backorderId, [...(childrenOf.get(backorder.backorderId) ?? []), backorder]);
  }

  return new Map(
    rootIds.map((rootId) => {
      const chain: { id: string; state: string; isDirect: boolean }[] = [];
      const visited = new Set([rootId]);
      let level = [rootId];

      while (level.length > 0) {
        const next = level.flatMap((id) => childrenOf.get(id) ?? []).filter((child) => !visited.has(child.id));

        next.forEach((child) => visited.add(child.id));
        chain.push(...next.map((child) => ({ id: child.id, state: child.state, isDirect: child.backorderId === rootId })));
        level = next.map((child) => child.id);
      }

      return [rootId, chain];
    }),
  );
};

const contactName = (contact: Contact | null) => contact?.name ?? '';
// A person has no address of their own here: their company's stands in.
const contactAddress = (contact: Contact | null) =>
  contact === null ? '' : contact.kind === 'company' ? contact.address : (contact.company?.address ?? '');

// The transfer's contact (else its first move's), the company behind a person contact, and where a
// delivery goes (the first move's contact, else the transfer's).
export const pickingContacts = (transferContact: Contact | null, firstMoveContact: Contact | null) => {
  const partner = transferContact ?? firstMoveContact;
  const delivery = firstMoveContact ?? transferContact;
  const company = partner?.kind === 'person' ? partner.company : null;

  return {
    partnerName: contactName(partner),
    hasTransferPartner: transferContact !== null,
    partnerAddress: contactAddress(partner),
    commercialPartnerName: company?.name ?? '',
    commercialPartnerAddress: company?.address ?? '',
    deliveryPartnerName: contactName(delivery),
    deliveryPartnerAddress: contactAddress(delivery),
  };
};

// The contact's picking instructions, then its parent company's, one per line.
export const pickingWarningText = (contactWarning: string | null, parentWarning: string | null) =>
  [contactWarning, parentWarning]
    .filter((warning): warning is string => warning !== null && warning !== '')
    .map((warning) => `${warning}\n`)
    .join('');

// Lines without a destination package first, then by package name from Z to A, then in the order
// they were made: this order decides which line sums up a move on the picking operations.
export const orderMoveLines = <TLine extends { resultPackageName: string; createdAt: string }>(lines: TLine[]) =>
  [...lines].sort((left, right) => {
    if (left.resultPackageName !== right.resultPackageName) {
      if (left.resultPackageName === '') {
        return -1;
      }
      if (right.resultPackageName === '') {
        return 1;
      }

      return left.resultPackageName < right.resultPackageName ? 1 : -1;
    }

    return left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : 0;
  });

// The note as plain text: the page prints text, so emphasis marks and heading signs are dropped.
export const plainNoteText = (markdown: string) =>
  markdown
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, '$2')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1'),
    )
    .join('\n')
    .trim();

type OpenPackageNode = {
  id: string;
  name: string;
  packageDestId: string | null;
  location: string;
  parentPackageName: string;
  packageDestName: string;
};

// The outermost package each whole-package line is headed into (following the destination
// containers up), once each, going where the first such line goes.
export const outermostOpenPackages = (
  entireLines: { packageId: string; to: string }[],
  packages: Map<string, OpenPackageNode>,
): PickingPrintOpenPackage[] => {
  const outermost = new Map<string, PickingPrintOpenPackage>();

  for (const line of entireLines) {
    let node = packages.get(line.packageId);
    const seen = new Set<string>();

    while (node !== undefined && node.packageDestId !== null && !seen.has(node.id)) {
      seen.add(node.id);
      const container = packages.get(node.packageDestId);

      if (container === undefined) {
        break;
      }
      node = container;
    }
    if (node !== undefined && !outermost.has(node.id)) {
      outermost.set(node.id, {
        id: node.id,
        name: node.name,
        from: node.location,
        parentPackageName: node.parentPackageName,
        to: line.to,
        packageDestName: node.packageDestName,
      });
    }
  }

  return [...outermost.values()];
};
