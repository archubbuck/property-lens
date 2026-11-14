import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, notFound } from "@/contracts/problem-details";

/** Public topic detail (title/description + ordered article list) for the topic landing page. */
export const GET = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const topic = await prisma.helpTopic.findUnique({
      where: { slug },
      include: { articles: { orderBy: { sortOrder: "asc" } } },
    });

    if (!topic) return notFound("Help topic not found.");

    return NextResponse.json({
      topic: {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        icon: topic.icon,
        articles: topic.articles.map((article) => ({
          id: article.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          updatedAt: article.updatedAt,
        })),
      },
      schemaVersion: "1.0",
    });
  }
);
