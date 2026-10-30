import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { getProcess } from "../../data/book";
import { CorporateQueue } from "../corporate/CorporateQueue";
import { DomesticQueue } from "../domestic/DomesticQueue";
import { ForexQueue } from "../forex/ForexQueue";
import { AuditQueue } from "../audit/AuditQueue";
import { ReservationDesk } from "../hotels/ReservationDesk";
import { TripPlanner } from "../planner/TripPlanner";

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
      {processModule.queueKind === "forex" ? <ForexQueue /> : null}
      {processModule.queueKind === "audit" ? <AuditQueue cases={processModule.cases} /> : null}
      {processModule.queueKind === "domestic" ? <DomesticQueue /> : null}
      {processModule.queueKind === "planner" ? <TripPlanner /> : null}
      {processModule.queueKind === "reservations" ? <ReservationDesk /> : null}
    </ProcessFrame>
  );
}

