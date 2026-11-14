import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpTopicIcon } from "@/components/help/help-topic-icon";
import { HelpSearch } from "@/components/help/help-search";

export const metadata = { title: "Help & Support | PropertyLens" };

async function getTopics() {
  return prisma.helpTopic.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { articles: true } } },
  });
}

async function getPopularArticles() {
  return prisma.helpArticle.findMany({
    orderBy: [{ sortOrder: "asc" }],
    take: 5,
    include: { topic: true },
  });
}

export default async function HelpLandingPage() {
  const [topics, popularArticles] = await Promise.all([getTopics(), getPopularArticles()]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-5">
        <div>
          <h1 className="font-serif text-3xl font-bold">Help &amp; Support</h1>
          <p className="mt-1 text-muted-foreground">
            Find answers, get guidance, and contact our team.
          </p>
        </div>
        <HelpSearch />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Browse by Topic</h2>
        {topics.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Help content coming soon"
            description="Topics and articles haven't been published yet. Check back shortly."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => (
              <Link key={topic.id} href={`/help/topics/${topic.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <span className="inline-flex w-fit rounded-lg bg-secondary p-2.5 text-primary">
                      <HelpTopicIcon icon={topic.icon} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold">{topic.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {topic._count.articles} article{topic._count.articles === 1 ? "" : "s"}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-serif text-xl font-semibold">Popular Articles</h2>
          <Card>
            {popularArticles.length === 0 ? (
              <CardContent className="p-5">
                <EmptyState
                  icon={FileText}
                  title="No articles yet"
                  description="Popular articles will appear here once help content is published."
                />
              </CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {popularArticles.map((article) => (
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
          <Card className="border-primary/20 bg-secondary/40">
            <CardContent className="space-y-3 p-5">
              <span className="inline-flex w-fit rounded-lg bg-card p-2.5 text-primary">
                <MessageSquare className="h-5 w-5" />
              </span>
              <h3 className="font-serif font-semibold">Contact Support</h3>
              <p className="text-sm text-muted-foreground">
                Can&apos;t find what you need? Our team is here to help.
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
                Typical response within a few hours · Mon–Fri, 8 AM–6 PM CT
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-risk-low" />
              <div>
                <h3 className="font-serif font-semibold">System Status</h3>
                <p className="text-sm text-muted-foreground">
                  All systems are operating normally.
                </p>
                <Badge variant="success" className="mt-2">
                  Operational
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
