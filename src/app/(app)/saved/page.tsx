import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/auth/session";
import {
  getActivityPage,
  getRecentChangesCount,
  getSavedPropertiesForUser,
} from "@/app/(app)/saved/_lib/queries";
import { SavedPropertiesView } from "@/components/saved/saved-properties-view";

export default async function SavedPropertiesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [properties, recent, updatedChangesCount] = await Promise.all([
    getSavedPropertiesForUser(userId),
    getActivityPage(userId, { limit: 5 }),
    getRecentChangesCount(userId),
  ]);

  return (
    <SavedPropertiesView
      initialProperties={properties}
      recentActivity={recent.items}
      updatedChangesCount={updatedChangesCount}
    />
  );
}
