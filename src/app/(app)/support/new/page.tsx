import { redirect } from "next/navigation";
import { Mail, MessageSquare, BookOpen, Activity, Clock } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewTicketForm } from "./new-ticket-form";

export const metadata = { title: "Send us a Message | PropertyLens" };

export default async function NewSupportTicketPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in?redirect_url=/support/new");

  const topics = await prisma.helpTopic.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Help & Support", href: "/help" }, { label: "Contact Support" }]} />

      <div className="flex items-start gap-4">
        <span className="inline-flex shrink-0 rounded-lg bg-secondary p-3 text-primary">
          <Mail className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold">Send us a Message</h1>
          <p className="mt-1 text-muted-foreground">
            Get help, report an issue, or ask a question. Our team typically responds within a few
            hours.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <NewTicketForm topics={topics.map((topic) => ({ slug: topic.slug, title: topic.title }))} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-1 p-5">
              <h3 className="font-serif font-semibold">Other Ways to Get Help</h3>
              <ul className="divide-y divide-border">
                <li className="flex items-center gap-3 py-2.5 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="block font-medium">Browse help articles</span>
                    <span className="block text-xs text-muted-foreground">
                      Find answers and step-by-step guides.
                    </span>
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2.5 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="block font-medium">Check system status</span>
                    <span className="block text-xs text-muted-foreground">
                      See if there are any known issues.
                    </span>
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2.5 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="block font-medium">Your ticket history</span>
                    <span className="block text-xs text-muted-foreground">
                      View replies to messages you&apos;ve already sent.
                    </span>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-secondary/40">
            <CardContent className="space-y-2 p-5">
              <h3 className="flex items-center gap-2 font-serif font-semibold">
                <Clock className="h-4 w-4" />
                Support Hours
              </h3>
              <p className="text-sm text-muted-foreground">Mon – Fri, 8 AM – 6 PM CT</p>
              <Badge variant="success">Typical response: within a few hours</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
