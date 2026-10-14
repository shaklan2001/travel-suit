import { SectionPage } from "../../../features/processes/SectionPage";
import { PROCESSES } from "../../../data/book";

export function generateStaticParams() {
  return PROCESSES.flatMap((processModule) =>
    (processModule.extraTabs ?? []).map((tab) => ({ processId: processModule.id, section: tab.slug })),
  );
}

interface SectionRouteProps {
  params: Promise<{ processId: string; section: string }>;
}

export default async function SectionRoute({ params }: SectionRouteProps) {
  const { processId, section } = await params;
  return <SectionPage processId={processId} section={section} />;
}
