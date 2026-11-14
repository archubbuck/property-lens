import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/auth/session";
import {
  getComparisonProperties,
  getSavedPropertiesForUser,
} from "@/app/(app)/saved/_lib/queries";
import { CompareView } from "@/components/saved/compare-view";

export default async function ComparePropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const { ids } = await searchParams;
  const requestedIds = Array.from(
    new Set((ids ?? "").split(",").map((id) => id.trim()).filter(Boolean))
  ).slice(0, 3);

  const [allSaved, comparisonProperties] = await Promise.all([
    getSavedPropertiesForUser(userId),
    getComparisonProperties(userId, requestedIds),
  ]);

  return (
    <CompareView allSaved={allSaved} selectedIds={requestedIds} comparisonProperties={comparisonProperties} />
  );
}
