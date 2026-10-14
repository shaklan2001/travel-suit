"use client";

import { useEffect } from "react";
import { useChatPlayback } from "../../components/chat/useChatPlayback";
import { initialTripState, respondTrip, type TripState } from "../../data/trip-planner";
import { TripChat } from "./TripPlanner";

interface EmbedChatProps {
  name: string;
  color: string;
  greeting: string;
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "TP";
}

/** The widget's chat. When the traveller asks for a quote, the host page hears about the new lead. */
export function EmbedChat({ name, color, greeting }: EmbedChatProps) {
  const chat = useChatPlayback<TripState>(() => {
    const state = initialTripState();
    if (greeting) state.messages[0] = { ...state.messages[0], text: greeting };
    return state;
  }, respondTrip);
  const leadCode = chat.committed.leadCode;

  useEffect(() => {
    if (leadCode && window.parent !== window) {
      window.parent.postMessage({ type: "vibrium:trip-lead", lead: leadCode }, "*");
    }
  }, [leadCode]);

  return (
    <main className="embed-root">
      <TripChat chat={chat} title={name} subtitle="Replies in seconds · an expert confirms the price" avatar={initials(name)} accent={color} />
    </main>
  );
}
