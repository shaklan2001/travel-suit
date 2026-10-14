"use client";

import { useEffect, useRef, useState } from "react";

const BOT_BEAT_MS = 650;
const PERSON_BEAT_MS = 900;

interface ChatState {
  messages: { from: string }[];
}

/**
 * Plays a scripted chat engine like a real conversation: the person's turn shows at once,
 * each bot message after a short typing beat. `committed` is the state as of the last
 * finished turn, so a side panel only updates once the reply has been read.
 */
export function useChatPlayback<S extends ChatState>(initial: () => S, respond: (state: S, input: string) => S) {
  const [state, setState] = useState<S>(initial);
  const [committed, setCommitted] = useState<S>(state);
  const [shown, setShown] = useState(state.messages.length);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const revealing = shown < state.messages.length;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  /** Schedules one turn's messages. Returns when the turn ends, in ms from now. */
  const play = (from: number, to: S, startAt = 0, last = true): number => {
    let delay = startAt;
    for (let index = from; index < to.messages.length; index += 1) {
      delay += to.messages[index].from === "bot" ? BOT_BEAT_MS : index === from && startAt === 0 ? 0 : PERSON_BEAT_MS;
      const count = index + 1;
      timers.current.push(window.setTimeout(() => setShown(count), delay));
    }
    timers.current.push(
      window.setTimeout(() => {
        setCommitted(to);
        if (last) {
          setBusy(false);
        }
      }, delay),
    );
    return delay;
  };

  const send = (text: string) => {
    if (busy || !text.trim()) {
      return;
    }
    const next = respond(state, text);
    setBusy(true);
    setState(next);
    play(state.messages.length, next);
  };

  /** Plays a whole scripted conversation from the start, updating the side panel turn by turn. */
  const replay = (turns: string[]) => {
    clearTimers();
    const start = initial();
    const states = turns.reduce<S[]>((list, turn) => [...list, respond(list[list.length - 1], turn)], [start]);
    setBusy(true);
    setState(states[states.length - 1]);
    setCommitted(start);
    setShown(start.messages.length);
    let at = 0;
    for (let index = 1; index < states.length; index += 1) {
      at = play(states[index - 1].messages.length, states[index], at, index === states.length - 1);
    }
  };

  const reset = () => {
    clearTimers();
    const fresh = initial();
    setState(fresh);
    setCommitted(fresh);
    setShown(fresh.messages.length);
    setBusy(false);
  };

  return {
    state,
    committed,
    visible: state.messages.slice(0, shown) as S["messages"],
    typing: revealing && state.messages[shown]?.from === "bot",
    busy,
    scroller,
    send,
    replay,
    reset,
  };
}
