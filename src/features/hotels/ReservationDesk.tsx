"use client";

import { useState } from "react";
import { CaseTable } from "../../components/ui/CaseTable";
import { FLIGHT_CASES, STAY_CASES } from "../../data/book";
import { StayCare } from "./StayCare";

type DeskView = "care" | "flights" | "stays";

/** The reservations workspace: in-stay care first, since a guest with a problem is the urgent work. */
export function ReservationDesk() {
  const [view, setView] = useState<DeskView>("care");

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Reservation desk views">
        <button type="button" role="tab" aria-selected={view === "care"} onClick={() => setView("care")}>
          In-stay care
        </button>
        <button type="button" role="tab" aria-selected={view === "flights"} onClick={() => setView("flights")}>
          Flight cases <b>{FLIGHT_CASES.length}</b>
        </button>
        <button type="button" role="tab" aria-selected={view === "stays"} onClick={() => setView("stays")}>
          Hotel cases <b>{STAY_CASES.length}</b>
        </button>
      </div>
      {view === "care" ? <StayCare /> : null}
      {view === "flights" ? <CaseTable cases={FLIGHT_CASES} /> : null}
      {view === "stays" ? <CaseTable cases={STAY_CASES} /> : null}
    </div>
  );
}
