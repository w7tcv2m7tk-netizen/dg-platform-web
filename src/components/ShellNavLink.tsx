"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * Sidebar / shell Link with instant pending affordance while the soft nav RSC loads.
 * useLinkStatus must render as a descendant of Link.
 */
export function ShellNavLink({
  href,
  prefetch = true,
  onClick,
  className,
  children,
}: {
  href: string;
  prefetch?: boolean;
  onClick?: () => void;
  className: string | ((pending: boolean) => string);
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={prefetch} onClick={onClick} className="block min-w-0">
      <ShellNavLinkInner className={className}>{children}</ShellNavLinkInner>
    </Link>
  );
}

function ShellNavLinkInner({
  className,
  children,
}: {
  className: string | ((pending: boolean) => string);
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  const resolved = typeof className === "function" ? className(pending) : className;
  return (
    <span
      className={`${resolved}${pending ? " animate-pulse opacity-80" : ""}`}
      data-nav-pending={pending ? "" : undefined}
      aria-busy={pending || undefined}
    >
      {children}
    </span>
  );
}
