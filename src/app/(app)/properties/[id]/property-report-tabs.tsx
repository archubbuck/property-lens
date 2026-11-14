"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Users, Landmark, Map, LineChart as LineChartIcon, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { getPropertyReport } from "@/app/api/v1/properties/_lib/property-data";
import { OverviewTab } from "@/components/report/overview-tab";
import { OwnershipTab } from "@/components/report/ownership-tab";
import { AssessmentTab } from "@/components/report/assessment-tab";
import { ZoningTab } from "@/components/report/zoning-tab";
import { MarketTab } from "@/components/report/market-tab";
import { HistoryTab } from "@/components/report/history-tab";

type Report = NonNullable<Awaited<ReturnType<typeof getPropertyReport>>>;

const TABS = [
  { value: "overview", label: "Overview", icon: Home },
  { value: "ownership", label: "Ownership", icon: Users },
  { value: "assessment", label: "Assessment & Taxes", icon: Landmark },
  { value: "zoning", label: "Zoning & Use", icon: Map },
  { value: "market", label: "Market Insights", icon: LineChartIcon },
  { value: "history", label: "History", icon: History },
];

export function PropertyReportTabs({ report }: { report: Report }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const findingsFor = (domain: string) => report.findings.filter((f) => f.domain === domain);

  return (
    <Tabs value={activeTab} onValueChange={handleChange}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} icon={<tab.icon className="h-4 w-4" />}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="pt-6">
        <OverviewTab overview={report.overview} findings={report.findings} />
      </TabsContent>
      <TabsContent value="ownership" className="pt-6">
        <OwnershipTab ownership={report.ownership} findings={findingsFor("ownership")} />
      </TabsContent>
      <TabsContent value="assessment" className="pt-6">
        <AssessmentTab assessment={report.assessment} findings={findingsFor("assessment")} />
      </TabsContent>
      <TabsContent value="zoning" className="pt-6">
        <ZoningTab zoning={report.zoning} findings={findingsFor("zoning")} />
      </TabsContent>
      <TabsContent value="market" className="pt-6">
        <MarketTab market={report.market} />
      </TabsContent>
      <TabsContent value="history" className="pt-6">
        <HistoryTab history={report.history} />
      </TabsContent>
    </Tabs>
  );
}
