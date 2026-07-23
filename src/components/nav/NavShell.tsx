"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/data/nav";

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) return <>{children}</>;

  return (
    <div className="md:flex md:min-h-screen">
      <aside className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:block md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-5 md:py-8">
        <Link
          href="/"
          className="shrink-0 font-mono text-sm font-semibold tracking-wider text-foreground"
        >
          S/G
        </Link>

        <nav className="hidden md:mt-10 md:flex md:flex-col md:gap-1">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors duration-200 ${
                  active
                    ? "bg-surface text-accent"
                    : "text-foreground-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:absolute md:bottom-8 md:left-5 md:right-5 md:block">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
            System
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-success">
            <span
              className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"
              aria-hidden
            />
            Online
          </div>
        </div>
      </aside>

      <main className="page-bg min-h-screen min-w-0 flex-1">{children}</main>
    </div>
  );
}
