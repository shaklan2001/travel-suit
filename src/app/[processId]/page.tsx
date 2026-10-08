import { ProcessOverview } from "../../features/processes/ProcessOverview";

interface ProcessPageProps {
  params: Promise<{ processId: string }>;
}

export default async function ProcessPage({ params }: ProcessPageProps) {
  const { processId } = await params;
  return <ProcessOverview processId={processId} />;
}
