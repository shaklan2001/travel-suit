import { redirect } from "next/navigation";

interface SquadRouteProps {
  params: Promise<{ processId: string }>;
}

/** The squad now opens as a modal over the process overview; keep old links working. */
export default async function SquadRoute({ params }: SquadRouteProps) {
  const { processId } = await params;
  redirect(`/${processId}?view=squad`);
}
