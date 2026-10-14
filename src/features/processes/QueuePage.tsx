import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { getProcess } from "../../data/book";
import { CaseTable } from "../../components/ui/CaseTable";
import { CorporateQueue } from "../corporate/CorporateQueue";
import { DomesticQueue } from "../domestic/DomesticQueue";
import { ForexQueue } from "../forex/ForexQueue";
import { AuditQueue } from "../audit/AuditQueue";
import { HotelDesk } from "../hotels/HotelDesk";
import { TripPlanner } from "../planner/TripPlanner";
import type { DomesticCallStage } from "../../data/domestic-tours";

interface QueuePageProps {
  processId: string;
}

export function QueuePage({ processId }: QueuePageProps) {
  const processModule = getProcess(processId);

  if (!processModule) {
    return <MissingProcess />;
  }

  return (
    <ProcessFrame processModule={processModule}>
      {processModule.queueKind === "corporate" ? <CorporateQueue /> : null}
      {processModule.queueKind === "forex" ? <ForexQueue cases={processModule.cases} /> : null}
      {processModule.queueKind === "audit" ? <AuditQueue cases={processModule.cases} /> : null}
      {processModule.queueKind === "domestic" ? <DomesticQueue focus={focusFor(processModule.id)} /> : null}
      {processModule.queueKind === "planner" ? <TripPlanner /> : null}
      {processModule.queueKind === "hotels" ? <HotelDesk cases={processModule.cases} /> : null}
      {processModule.queueKind === "cases" ? <CaseTable cases={processModule.cases} /> : null}
    </ProcessFrame>
  );
}

function focusFor(processId: string): DomesticCallStage {
  if (processId === "during") {
    return "in_tour";
  }
  if (processId === "post") {
    return "completion";
  }
  return "pre_tour";
}
