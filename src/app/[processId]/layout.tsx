import type { ReactNode } from "react";
import { PROCESSES } from "../../data/book";

export function generateStaticParams() {
  return PROCESSES.map((processModule) => ({ processId: processModule.id }));
}

interface ProcessLayoutProps {
  children: ReactNode;
}

export default function ProcessLayout({ children }: ProcessLayoutProps) {
  return children;
}
