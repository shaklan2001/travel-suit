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
  children: ReactNode;
}

/**
 * App-router stand-in for the previous exact and nested NavLink behavior.
 * Active links expose aria-current so the existing styles can highlight them.
 */
export function SuiteNavLink({ href, className, end = false, label, children }: SuiteNavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link className={className} href={href} aria-current={isActive ? "page" : undefined} data-label={label}>
      {children}
    </Link>
  );
}
