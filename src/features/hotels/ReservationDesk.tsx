"use client";

import { useState } from "react";
import { CaseTable } from "../../components/ui/CaseTable";
import type { QueueCase } from "../../data/types";
import { StayCare } from "./StayCare";

type DeskView = "care" | "cases";

/** The hotel workspace: in-stay care first, since a guest with a problem is the urgent work. */
export function HotelDesk({ cases }: { cases: QueueCase[] }) {
  const [view, setView] = useState<DeskView>("care");

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Stay desk views">
        <button type="button" role="tab" aria-selected={view === "care"} onClick={() => setView("care")}>
          In-stay care
        </button>
        <button type="button" role="tab" aria-selected={view === "cases"} onClick={() => setView("cases")}>
          All hotel cases <b>{cases.length}</b>
        </button>
      </div>
      {view === "care" ? <StayCare /> : <CaseTable cases={cases} />}
    </div>
  );
}
