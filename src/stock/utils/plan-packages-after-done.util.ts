import { translate } from 'src/shared/i18n/translate';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { planPackageLocations } from 'src/stock/utils/plan-package-rules.util';
import { planApplyDestToPackage, projectPackageStock } from 'src/stock/utils/plan-packages-at-validate.util';
import { type PackagesAfterDonePlan } from 'src/stock/package/types/packages-after-done-plan.type';
import { type PackageMoveLine } from 'src/stock/utils/types/package-move-line.type';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';

type DoneLine = PackageMoveLine & {
  id: string;
  pickingId: string | null;
  productId: string;
  ownerId: string | null;
  lotId: string | null;
};

// Once the lines' stock moved, their result packages go into their destination
// containers. Stock the other transfers of the same click are still to move
// counts where it is going, as when the transfers are validated together. One
// refused container leaves every package where it is, and a note on each
// transfer (or on the refused containers, for lines of no transfer) says why;
// its id comes from the lines, so a rerun does not add it twice. Counts skip
// the containers. Rows of lines that kept their package are cleared once empty.
export const planPackagesAfterDone = ({
  lines,
  skipContainers,
  packages,
  packageQuants,
  pendingLines,
  locationNames,
}: {
  lines: DoneLine[];
  skipContainers: boolean;
  packages: Map<string, PackageNode>;
  packageQuants: { packageId: string; locationId: string; quantity: number }[];
  pendingLines: PackageMoveLine[];
  locationNames: Map<string, string>;
}): PackagesAfterDonePlan => {
  const emptyRowKeys = [
    ...new Set(
      lines
        .filter((line) => line.packageId !== null && line.packageId === line.resultPackageId)
        .flatMap((line) => [sourceKeyOf(line), destinationKeyOf(line)]),
    ),
  ];
  const resultPackageIds = [...new Set(lines.flatMap((line) => line.resultPackageId ?? []))];

  if (skipContainers || resultPackageIds.length === 0) {
    return { containerWrites: [], notes: [], emptyRowKeys };
  }
  const after = projectPackageStock(packageQuants, pendingLines);
  const containers = planApplyDestToPackage({
    startPackageIds: resultPackageIds,
    packages,
    packageLocation: planPackageLocations({ packages: [...packages.values()], firstPositiveQuantLocation: after.firstPositiveLocation }),
    quantLocations: after.nonZeroLocations,
    locationNames,
  });

  if (containers.errors.length === 0) {
    return { containerWrites: containers.writes, notes: [], emptyRowKeys };
  }
  const body = containers.errors.map((refusal) => translate('en', refusal.message, refusal.values)).join('\n');
  const lineKey = [...new Set(lines.map((line) => line.id))].sort().join(',');
  const pickingIds = [...new Set(lines.flatMap((line) => line.pickingId ?? []))];
  const targets =
    pickingIds.length > 0
      ? pickingIds.map((recordId) => ({ objectSingular: 'stockPicking' as const, recordId }))
      : [...new Set(containers.refusedContainerIds)].map((recordId) => ({ objectSingular: 'stockPackage' as const, recordId }));

  return {
    containerWrites: [],
    notes: targets.map((target) => ({ id: derivedId('packagesNotPlaced', target.recordId, lineKey), ...target, body })),
    emptyRowKeys,
  };
};
