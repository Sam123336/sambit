import PageShell from "@/components/nav/PageShell";
import { DownloadIcon } from "@/components/icons";
import { profile } from "@/data/profile";

export default function ResumePage() {
  return (
    <PageShell eyebrow="Resume" title="Resume">
      <p className="mb-8 text-foreground-muted">
        One-page PDF — experience, projects, and education. Questions? Email{" "}
        <a
          href={`mailto:${profile.email}`}
          className="text-accent underline underline-offset-4"
        >
          {profile.email}
        </a>
        .
      </p>
      <a
        href="/resume.pdf"
        download
        className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
      >
        <DownloadIcon size={14} />
        Download PDF
      </a>
    </PageShell>
  );
}
