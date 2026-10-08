import { QueuePage } from "../../../features/processes/QueuePage";

interface QueueRouteProps {
  params: Promise<{ processId: string }>;
}

export default async function QueueRoute({ params }: QueueRouteProps) {
  const { processId } = await params;
  return <QueuePage processId={processId} />;
}