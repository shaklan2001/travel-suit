import { redirect } from "next/navigation";

interface MapRouteProps {
  params: Promise<{ processId: string }>;
}

/** The process map now opens as a modal over the process overview; keep old links working. */
export default async function MapRoute({ params }: MapRouteProps) {
  const { processId } = await params;
  redirect(`/${processId}?view=map`);
}
