import type { ReactNode } from "react";
import type { ProcessModule } from "../../data/types";
import { ProcessMapPanel } from "../../features/processes/ProcessMapPage";
import { SquadPanel } from "../../features/processes/SquadPage";
import { ProcessInsights } from "./ProcessInsights";
import { SuiteNavLink } from "./SuiteNavLink";

interface ProcessFrameProps {
  processModule: ProcessModule;
  children: ReactNode;
}

export function ProcessFrame({ processModule, children }: ProcessFrameProps) {
  const basePath = `/${processModule.id}`;
  const workspaceTab = <SuiteNavLink href={`${basePath}/queue`}>{processModule.workspaceLabel ?? "Queue"}</SuiteNavLink>;

  return (
    <main className="page">
      <header className="page-header process-header">
        <div>
          <p className="kicker">{processModule.group}</p>
          <h1>{processModule.name}</h1>
          <p className="lede">{processModule.oneLiner}</p>
        </div>
        <ProcessInsights
          processName={processModule.name}
          agentCount={processModule.agents.length}
          stepCount={processModule.steps.length}
          squad={<SquadPanel processModule={processModule} />}
          map={<ProcessMapPanel processModule={processModule} />}
        />
      </header>
      <nav className="tabs" aria-label={`${processModule.name} sections`}>
        {processModule.opensOnWorkspace ? workspaceTab : null}
        <SuiteNavLink href={basePath} end>Overview</SuiteNavLink>
        {processModule.opensOnWorkspace ? null : workspaceTab}
        {processModule.extraTabs?.map((tab) => (
          <SuiteNavLink key={tab.slug} href={`${basePath}/${tab.slug}`}>
            {tab.label}
          </SuiteNavLink>
        ))}
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
        <p className="lede">The Travel Suite has six processes. Open Suite Home and pick one.</p>
      </header>
      <SuiteNavLink className="primary-button button-link" href="/home" end>
        Suite Home
      </SuiteNavLink>
    </main>
  );
}
