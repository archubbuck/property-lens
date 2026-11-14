import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, notFound } from "@/contracts/problem-details";

/** Public article detail + related articles (same topic) for the help article page. */
export const GET = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const article = await prisma.helpArticle.findUnique({
      where: { slug },
      include: { topic: true },
    });

    if (!article) return notFound("Help article not found.");

    const related = await prisma.helpArticle.findMany({
      where: { topicId: article.topicId, slug: { not: article.slug } },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });

    return NextResponse.json({
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        content: article.content,
        updatedAt: article.updatedAt,
        topic: {
          id: article.topic.id,
          slug: article.topic.slug,
          title: article.topic.title,
        },
      },
      relatedArticles: related.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
      })),
      schemaVersion: "1.0",
    });
  }
);
