import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling } from "@/contracts/problem-details";

/**
 * Deterministic help search across topics and articles. Uses case-insensitive
 * substring matching (Postgres ILIKE via Prisma's `contains`/`insensitive`
 * mode); the schema has no tsvector columns yet, so this stands in for full
 * Postgres full-text search until one is added.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ query: q, topics: [], articles: [], schemaVersion: "1.0" });
  }

  const [topics, articles] = await Promise.all([
    prisma.helpTopic.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.helpArticle.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { topic: true },
      orderBy: { sortOrder: "asc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    query: q,
    topics: topics.map((topic) => ({
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      icon: topic.icon,
    })),
    articles: articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      topic: { slug: article.topic.slug, title: article.topic.title },
    })),
    schemaVersion: "1.0",
  });
});
