import PageShell from "@/components/nav/PageShell";
import { experience } from "@/data/profile";

export default function ExperiencePage() {
  return (
    <PageShell eyebrow="Experience" title="Where I've worked">
      <div className="space-y-8">
        {experience.map((role) => (
          <div
            key={`${role.org}-${role.period}`}
            className="border-l-2 border-border pl-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-lg font-semibold">{role.role}</h2>
              <span className="font-mono text-xs text-foreground-muted">
                {role.period}
              </span>
            </div>
            <div className="mb-3 font-mono text-sm text-accent">
              {role.org}
            </div>
            <ul className="space-y-1.5 text-sm text-foreground-muted">
              {role.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-foreground-muted/50">—</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
