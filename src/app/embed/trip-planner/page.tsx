import { EmbedChat } from "../../../features/planner/EmbedChat";

interface EmbedRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** The page the website widget loads in its iframe: the trip planner chat alone, in the agency's colours. */
export default async function EmbedTripPlannerRoute({ searchParams }: EmbedRouteProps) {
  const params = await searchParams;
  const color = first(params.color);
  return (
    <EmbedChat
      name={first(params.name).slice(0, 40) || "Trip Planner"}
      color={/^#[0-9a-f]{6}$/i.test(color) ? color : "#2c70f6"}
      greeting={first(params.greeting).slice(0, 160)}
    />
  );
}
