import Link from "next/link";
import type { AlertItem, Kpi, TodoItem } from "../../data/types";

interface KpiGridProps {
  kpis: Kpi[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section className="kpi-grid" aria-label="Key figures">
      {kpis.map((kpi) => (
        <article className="kpi" key={kpi.id}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <small>{kpi.delta}</small>
        </article>
      ))}
    </section>
  );
}

interface AlertListProps {
  items: { href: string; alert: AlertItem }[];
}

export function AlertList({ items }: AlertListProps) {
  return (
    <div className="stack">
      {items.map(({ href, alert }) => (
        <Link className="alert" key={alert.id} href={href}>
          <span className={`severity ${alert.severity}`}>{alert.severity}</span>
          <div>
            <p><strong>{alert.code}</strong> · {alert.title}</p>
            <p className="detail">{alert.detail}</p>
            <p className="detail">→ {alert.action}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

interface TodoListProps {
  items: { href: string; rank: number; todo: TodoItem }[];
}

export function TodoList({ items }: TodoListProps) {
  return (
    <div className="stack">
      {items.map(({ href, rank, todo }) => (
        <Link className="todo" key={todo.id} href={href}>
          <span className="rank">{rank}</span>
          <div>
            <p>{todo.title}</p>
            <span>{todo.owner} · {todo.code}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
