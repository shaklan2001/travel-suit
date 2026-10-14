import type { QueueCase } from "../../data/types";

export function CaseTable({ cases }: { cases: QueueCase[] }) {
  if (cases.length === 0) {
    return <p>No open cases.</p>;
  }

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Title</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Next</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((queueCase) => (
            <tr key={queueCase.code}>
              <td className="case-cell">{queueCase.code}</td>
              <td>{queueCase.title}</td>
              <td>
                <span className="status-pill">{queueCase.status}</span>
              </td>
              <td>{queueCase.owner}</td>
              <td>{queueCase.next}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
