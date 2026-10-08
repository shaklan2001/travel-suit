import { ProcessMapPage } from "../../../features/processes/ProcessMapPage";

interface MapRouteProps {
  params: Promise<{ processId: string }>;
}

export default async function MapRoute({ params }: MapRouteProps) {
  const { processId } = await params;
  return <ProcessMapPage processId={processId} />;
}
