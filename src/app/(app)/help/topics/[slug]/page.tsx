import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, Mail, Clock } from "lucide-react";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpTopicIcon } from "@/components/help/help-topic-icon";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = await prisma.helpTopic.findUnique({ where: { slug } });
  return { title: topic ? `${topic.title} | Help & Support | PropertyLens` : "Help & Support" };
}

async function getTopic(slug: string) {
  return prisma.helpTopic.findUnique({
    where: { slug },
    include: { articles: { orderBy: { sortOrder: "asc" } } },
  });
}

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopic(slug);

  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[{ label: "Help & Support", href: "/help" }, { label: topic.title }]}
      />

      <div className="flex items-start gap-4">
        <span className="inline-flex shrink-0 rounded-lg bg-secondary p-3 text-primary">
          <HelpTopicIcon icon={topic.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold">{topic.title}</h1>
          <p className="mt-1 text-muted-foreground">{topic.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-serif text-xl font-semibold">All Articles in This Topic</h2>
          <Card>
            {topic.articles.length === 0 ? (
              <CardContent className="p-5">
                <EmptyState
                  icon={FileText}
                  title="No articles yet"
                  description="Articles for this topic haven't been published yet."
                />
              </CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {topic.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/help/articles/${article.slug}`}
                      className="flex items-center gap-3 p-4 hover:bg-muted"
                    >
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">
                        <span className="block font-medium">{article.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {article.summary}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-2 p-5">
              <h3 className="font-serif font-semibold">In This Topic</h3>
              <p className="text-sm text-muted-foreground">
                {topic.articles.length} article{topic.articles.length === 1 ? "" : "s"}
              </p>
              <ul className="space-y-1.5 pt-1 text-sm">
                {topic.articles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/help/articles/${article.slug}`} className="hover:text-primary">
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
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
