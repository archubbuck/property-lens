import { NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling } from "@/contracts/problem-details";

/** Public help topic catalog with article counts, used by the Help & Support landing page. */
export const GET = withErrorHandling(async () => {
  const topics = await prisma.helpTopic.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json({
    topics: topics.map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      icon: topic.icon,
      articleCount: topic._count.articles,
    })),
    schemaVersion: "1.0",
  });
});
