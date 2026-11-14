import Link from "next/link";
import { notFound } from "next/navigation";
import { Home, Ruler, Layers, Calendar } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getPropertyHero, getPropertyReport } from "@/app/api/v1/properties/_lib/property-data";
import { SavePropertyButton } from "./save-property-button";
import { PropertyMenu } from "./property-menu";
import { PropertyReportTabs } from "./property-report-tabs";

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();

  const hero = await getPropertyHero(id, userId);
  if (!hero) notFound();

  const report = await getPropertyReport(id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Breadcrumb items={[{ label: "Research", href: "/research" }, { label: hero.address?.line1 ?? "Property" }]} />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {hero.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.media[0].url} alt={hero.media[0].altText ?? "Property photo"} className="h-full w-full object-cover" />
            ) : (
              <Home className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">{hero.address?.line1 ?? "Property"}</h1>
            <p className="text-muted-foreground">
              {hero.address ? `${hero.address.city}, ${hero.address.state} ${hero.address.postalCode}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-4 w-4" /> {titleCase(hero.propertyType)}
              </span>
              {hero.lotSizeAcres != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Ruler className="h-4 w-4" /> ± {hero.lotSizeAcres} ac
                  {hero.lotSizeSqFt != null ? ` (${hero.lotSizeSqFt.toLocaleString()} sq ft)` : ""}
                </span>
              )}
              {hero.livingAreaSqFt != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> {hero.livingAreaSqFt.toLocaleString()} sq ft
                </span>
              )}
              {hero.yearBuilt != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Built {hero.yearBuilt}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SavePropertyButton propertyId={hero.id} initialSaved={hero.isSaved} signedIn={Boolean(userId)} />
          <PropertyMenu propertyId={hero.id} />
        </div>
      </section>

      {report ? (
        <PropertyReportTabs report={report} />
      ) : (
        <EmptyState
          icon={Home}
          title="No report available for this property"
          description="This property doesn't have a completed research report. Real address resolution isn't wired up in this environment yet — try the sample property for a fully working report."
          action={
            <Link href="/research" className={buttonVariants({ variant: "primary" })}>
              Back to Research
            </Link>
          }
        />
      )}
    </div>
  );
}
