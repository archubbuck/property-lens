import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Mail, Clock } from "lucide-react";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArticleBody } from "@/components/help/article-body";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.helpArticle.findUnique({ where: { slug } });
  return { title: article ? `${article.title} | Help & Support | PropertyLens` : "Help & Support" };
}

async function getArticle(slug: string) {
  return prisma.helpArticle.findUnique({ where: { slug }, include: { topic: true } });
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const related = await prisma.helpArticle.findMany({
    where: { topicId: article.topicId, slug: { not: article.slug } },
    orderBy: { sortOrder: "asc" },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Help & Support", href: "/help" },
          { label: article.topic.title, href: `/help/topics/${article.topic.slug}` },
          { label: article.title },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h1 className="font-serif text-3xl font-bold">{article.title}</h1>
            <p className="mt-1 text-muted-foreground">{article.summary}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Updated {formatDate(article.updatedAt)}
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <ArticleBody content={article.content} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-2 p-5">
              <h3 className="font-serif font-semibold">Related Articles</h3>
              {related.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related articles yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/help/articles/${item.slug}`}
                        className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-primary"
                      >
                        {item.title}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-secondary/40">
            <CardContent className="space-y-3 p-5">
              <h3 className="font-serif font-semibold">Still need help?</h3>
              <p className="text-sm text-muted-foreground">
                Our team is here to answer your questions.
              </p>
              <Link
                href="/support/new"
                className={buttonVariants({ variant: "primary", className: "w-full" })}
              >
                <Mail className="h-4 w-4" />
                Send us a message
              </Link>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Mon–Fri, 8 AM–6 PM CT
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
