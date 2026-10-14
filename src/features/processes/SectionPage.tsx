import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { getProcess } from "../../data/book";
import { FunnelDashboard } from "../planner/FunnelDashboard";
import { QuoteDesk } from "../planner/QuoteDesk";
import { TripDocuments } from "../planner/TripDocuments";
import { WidgetStudio } from "../planner/WidgetStudio";

interface SectionPageProps {
  processId: string;
  section: string;
}

/** A module's extra workspace tabs. Only the sections a module lists in extraTabs resolve. */
export function SectionPage({ processId, section }: SectionPageProps) {
  const processModule = getProcess(processId);
  if (!processModule || !processModule.extraTabs?.some((tab) => tab.slug === section)) {
    return <MissingProcess />;
  }

  return (
    <ProcessFrame processModule={processModule}>
      {processId === "planner" && section === "widget" ? <WidgetStudio /> : null}
      {processId === "planner" && section === "desk" ? <QuoteDesk /> : null}
      {processId === "planner" && section === "documents" ? <TripDocuments /> : null}
      {processId === "planner" && section === "funnel" ? <FunnelDashboard /> : null}
    </ProcessFrame>
  );
}
