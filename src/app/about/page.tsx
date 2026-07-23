import PageShell from "@/components/nav/PageShell";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { profile, stack, education } from "@/data/profile";

export default function AboutPage() {
  return (
    <PageShell eyebrow="About" title={profile.name}>
      <p className="mb-6 font-mono text-xs text-foreground-muted">
        {profile.location}
      </p>
      <div className="space-y-4 text-foreground-muted">
        {profile.bio.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-5 font-mono text-xs">
        <a
          href={profile.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent underline underline-offset-4"
        >
          <LinkedInIcon size={13} />
          LinkedIn
        </a>
        <a
          href={profile.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent underline underline-offset-4"
        >
          <GitHubIcon size={13} />
          GitHub
        </a>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Stack
        </h2>
        <dl className="space-y-1.5 font-mono text-xs">
          {stack.map(([group, items]) => (
            <div key={group} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt className="w-24 shrink-0 text-foreground-muted">{group}</dt>
              <dd className="text-foreground">{items}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Education
        </h2>
        <div className="border-l-2 border-border pl-5">
          <div className="text-sm font-semibold">{education.school}</div>
          <div className="mt-0.5 text-sm text-foreground-muted">
            {education.degree}
          </div>
          <div className="mt-1 font-mono text-xs text-foreground-muted">
            {education.location} · {education.period}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
