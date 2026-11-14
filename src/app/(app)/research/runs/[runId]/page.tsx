import { RunProgress } from "./run-progress";

export const metadata = { title: "Researching Your Property | PropertyLens" };

export default async function ResearchRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <RunProgress runId={runId} />;
}
