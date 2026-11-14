import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/auth/session";
import {
  getActivityPage,
  getActivitySummary,
  getPropertiesInActivity,
} from "@/app/(app)/saved/_lib/queries";
import { ActivityView } from "@/components/saved/activity-view";

export default async function ActivityPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [page, summary, propertiesInActivity] = await Promise.all([
    getActivityPage(userId, { limit: 10 }),
    getActivitySummary(userId),
    getPropertiesInActivity(userId),
  ]);

  return (
    <ActivityView
      initialItems={page.items}
      initialNextCursor={page.nextCursor}
      initialHasMore={page.hasMore}
      summary={summary}
      propertiesInActivity={propertiesInActivity}
    />
  );
}
