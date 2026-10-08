import type { ReactNode } from "react";
import type { ProcessModule } from "../../data/types";
import { SuiteNavLink } from "./SuiteNavLink";

interface ProcessFrameProps {
  processModule: ProcessModule;
  children: ReactNode;
}

export function ProcessFrame({ processModule, children }: ProcessFrameProps) {
  const basePath = `/${processModule.id}`;

  return (
    <main className="page">
      <header className="page-header">
        <p className="kicker">{processModule.group}</p>
        <h1>{processModule.name}</h1>
        <p className="lede">{processModule.oneLiner}</p>
      </header>
      <nav className="tabs" aria-label={`${processModule.name} sections`}>
        <SuiteNavLink href={basePath} end>Overview</SuiteNavLink>
        <SuiteNavLink href={`${basePath}/squad`}>Agentic Squad</SuiteNavLink>
        <SuiteNavLink href={`${basePath}/map`}>Process Map</SuiteNavLink>
        <SuiteNavLink href={`${basePath}/queue`}>{processModule.workspaceLabel ?? "Queue"}</SuiteNavLink>
      </nav>
      {children}
    </main>
  );
}

export function MissingProcess() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>That process is not in the book</h1>
        <p className="lede">The Travel Suite has eight processes. Open Suite Home and pick one.</p>
      </header>
      <SuiteNavLink className="primary-button button-link" href="/home" end>
        Suite Home
      </SuiteNavLink>
    </main>
  );
}
