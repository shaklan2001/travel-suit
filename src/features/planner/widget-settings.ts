/** The agency's widget branding. Kept in this browser so the documents studio can reuse the same brand. */
export interface WidgetSettings {
  name: string;
  color: string;
  label: string;
  greeting: string;
  position: "right" | "left";
}

const KEY = "vts.planner.widget.v1";

export const DEFAULT_WIDGET: WidgetSettings = {
  name: "Wanderlust Holidays",
  color: "#2c70f6",
  label: "Plan my trip",
  greeting: "",
  position: "right",
};

export function loadWidgetSettings(): WidgetSettings {
  if (typeof window === "undefined") return DEFAULT_WIDGET;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<WidgetSettings> | null;
    return saved ? { ...DEFAULT_WIDGET, ...saved } : DEFAULT_WIDGET;
  } catch {
    return DEFAULT_WIDGET;
  }
}

export function saveWidgetSettings(settings: WidgetSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not saved; the studio still works for this visit.
  }
}
