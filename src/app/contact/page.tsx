import PageShell from "@/components/nav/PageShell";
import { GitHubIcon, LinkedInIcon, MailIcon } from "@/components/icons";
import { profile } from "@/data/profile";

export default function ContactPage() {
  return (
    <PageShell eyebrow="Contact" title="Get in touch">
      <p className="mb-6 text-foreground-muted">
        Best way to reach me is email — I read everything.
      </p>
      <a
        href={`mailto:${profile.email}`}
        className="inline-flex items-center gap-2.5 rounded-md border border-border bg-surface px-4 py-2 font-mono text-sm text-accent transition-colors hover:border-accent"
      >
        <MailIcon size={15} />
        {profile.email}
      </a>

      <div className="mt-6 flex gap-6 font-mono text-xs uppercase tracking-widest text-foreground-muted">
        <a
          href={profile.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          <LinkedInIcon size={13} />
          LinkedIn
        </a>
        <a
          href={profile.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          <GitHubIcon size={13} />
          GitHub
        </a>
      </div>
    </PageShell>
  );
}
