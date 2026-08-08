"use client";

import type { ReactNode } from "react";

/** Long emails / URLs / names — wrap or truncate without blowing out the layout. */
export function BreakText({
  children,
  className = "",
  as: Tag = "span",
  title,
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
  title?: string;
}) {
  return (
    <Tag className={`dg-break-anywhere min-w-0 ${className}`} title={title}>
      {children}
    </Tag>
  );
}

/** Table / list email line — wrap long addresses; stop row click when used in clickable rows. */
export function EmailLine({
  email,
  className = "",
}: {
  email: string;
  className?: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className={`dg-break-anywhere block min-w-0 text-slate-400 hover:text-blue-300 ${className}`}
      title={email}
      onClick={(e) => e.stopPropagation()}
    >
      {email}
    </a>
  );
}
