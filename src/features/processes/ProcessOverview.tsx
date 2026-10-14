import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { CaseTable } from "../../components/ui/CaseTable";
import { StageBars, WeekColumns } from "../../components/ui/Charts";
import { AlertList, KpiGrid, TodoList } from "../../components/ui/FactLists";
import { StoryStrip } from "../../components/ui/StoryStrip";
import { getProcess } from "../../data/book";
import { BOOK_AS_OF_LABEL } from "../../lib/suite-config";

interface ProcessOverviewProps {
  processId: string;
}

export function ProcessOverview({ processId }: ProcessOverviewProps) {
  const processModule = getProcess(processId);

  if (!processModule) {
    return <MissingProcess />;
  }

  const workspaceHref = `/${processModule.id}/queue`;
  const alerts = processModule.alerts.map((alert) => ({ href: workspaceHref, alert }));
  const todos = processModule.todos.map((todo, index) => ({ href: workspaceHref, todo, rank: index + 1 }));
  const dashboard = processModule.dashboard;
  const narrators = processModule.agents
    .filter((agent) => agent.kind !== "conversational")
    .slice(0, 2)
    .map((agent) => agent.name);

  return (
    <ProcessFrame processModule={processModule}>
      <StoryStrip steps={processModule.story} title={processModule.storyTitle} />
      {processModule.moreStories?.map((story) => (
        <StoryStrip key={story.title} steps={story.steps} title={story.title} />
      ))}

      <KpiGrid kpis={processModule.kpis} />

      <section className="card brief">
        <div className="brief-head">
          <h2>Morning brief</h2>
          <span className="meta">
            {BOOK_AS_OF_LABEL}
            {narrators.length > 0 ? ` · narrated by ${narrators.join(" and ")}` : ""}
          </span>
        </div>
        <p>{processModule.brief}</p>
      </section>

      {dashboard ? (
        <section className="section chart-grid" aria-label="Charts">
          <StageBars title={dashboard.stageTitle} unit={dashboard.stageUnit} stages={dashboard.stages} />
          <WeekColumns title={dashboard.weekTitle} week={dashboard.week} />
        </section>
      ) : null}

      <section className="section split">
        <div>
          <h2>Priority now</h2>
          <AlertList items={alerts} />
        </div>
        <div>
          <h2>Today</h2>
          <TodoList items={todos} />
        </div>
      </section>

      {processModule.cases.length > 0 ? (
        <section className="section">
          <h2>Open cases</h2>
          <CaseTable cases={processModule.cases} />
        </section>
      ) : null}
    </ProcessFrame>
  );
}
