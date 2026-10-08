import { SquadPage } from "../../../features/processes/SquadPage";

interface SquadRouteProps {
  params: Promise<{ processId: string }>;
}

export default async function SquadRoute({ params }: SquadRouteProps) {
  const { processId } = await params;
  return <SquadPage processId={processId} />;
}
