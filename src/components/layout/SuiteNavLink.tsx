"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SuiteNavLinkProps {
  href: string;
  className?: string;
  end?: boolean;
  /** Shown as the collapsed-rail tooltip. */
  label?: string;
  /** Highlight for any route under this path, when the link itself points deeper (e.g. a module that opens on its workspace). */
  activePrefix?: string;
  children: ReactNode;
}

/**
 * App-router stand-in for the previous exact and nested NavLink behavior.
 * Active links expose aria-current so the existing styles can highlight them.
 */
export function SuiteNavLink({ href, className, end = false, label, activePrefix, children }: SuiteNavLinkProps) {
  const pathname = usePathname();
  const base = activePrefix ?? href;
  const isActive = end ? pathname === href : pathname === base || pathname.startsWith(`${base}/`);

  return (
    <Link className={className} href={href} aria-current={isActive ? "page" : undefined} data-label={label}>
      {children}
    </Link>
  );
}
