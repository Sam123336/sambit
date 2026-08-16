import Image from "next/image";
import PageShell from "@/components/nav/PageShell";
import PhoneStrip from "@/components/fx/PhoneStrip";
import BlurReveal from "@/components/fx/BlurReveal";
import { profile, workStories } from "@/data/profile";

const CONTEXTIFLY_URL = "https://www.contextifly.in/";
// thum.io renders a screenshot of the live site on request
const CONTEXTIFLY_SHOT = `https://image.thum.io/get/width/1400/${CONTEXTIFLY_URL}`;

// ordered as a customer walks it: browse → menu → cart → track → account
const FURTILO_SHOTS = [
  ["/work/furtilo-home.png", "Discovery — location-aware feed, only what we can deliver to you"],
  ["/work/furtilo-menu.jpg", "Storefront — merchant catalog, veg flags, live prices and stock"],
  ["/work/furtilo-cart.png", "Cart — live serviceability and item availability at checkout"],
  ["/work/furtilo-track.png", "Tracking — order lifecycle events, OTP handoff, cancellation window"],
  ["/work/furtilo-profile.png", "Profile — wallet, addresses, merchant and rider onboarding"],
] as const;

export default function WorkPage() {
  return (
    <PageShell eyebrow="Work" title="Selected work">
      <p className="-mt-6 mb-10 text-sm text-foreground-muted">
        Four problems, what actually fixed them.
      </p>

      <div className="divide-y divide-border border-y border-border">
        {workStories.map((story) => (
          <details key={story.id} className="group py-5">
            <summary className="grid cursor-pointer list-none grid-cols-[2rem_1fr] items-baseline gap-x-3 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-x-4">
              <span className="font-mono text-xs text-foreground-muted">{story.number}</span>
              <span>
                <span className="text-base font-semibold">{story.title}</span>
                <span className="mt-1 block font-mono text-[11px] text-foreground-muted">
                  {story.context}
                </span>
                <span className="mt-2 block text-sm text-foreground-muted">{story.summary}</span>
                <span className="mt-2 block font-mono text-xs text-accent sm:hidden">{story.stat}</span>
              </span>
              <span className="col-start-2 mt-2 text-left sm:col-start-3 sm:mt-0 sm:text-right">
                <span className="hidden font-mono text-xs text-accent sm:block">{story.stat}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60 group-open:hidden">
                  + read
                </span>
                <span className="mt-1 hidden font-mono text-[10px] uppercase tracking-widest text-foreground-muted/60 group-open:block">
                  − close
                </span>
              </span>
            </summary>
            <div className="mt-5 space-y-5 sm:pl-[3.5rem]">
              {story.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground">
                    {section.heading}
                  </h3>
                  <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
            furtilo
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            30,000+ users
          </span>
        </div>
        <p className="mt-3 max-w-lg text-sm text-foreground-muted">
          The consumer app the three stories above ship into. I build the backend behind these
          screens — serviceability, cart and order state, payments and refunds, live tracking.
        </p>
        <PhoneStrip shots={FURTILO_SHOTS} />
      </div>

      <div className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
            contextifly.in
          </h2>
          <a
            href={CONTEXTIFLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline hover:underline-offset-4"
          >
            visit ↗
          </a>
        </div>
        <p className="mt-3 max-w-lg text-sm text-foreground-muted">
          The side project above, live. Install it as a Claude plugin and it builds the graph from
          your own repo.
        </p>
        <a
          href={CONTEXTIFLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block border border-border transition-colors hover:border-foreground-muted"
        >
          <span className="relative block aspect-[16/10] w-full bg-bg-elevated">
            <Image
              src={CONTEXTIFLY_SHOT}
              alt="Screenshot of contextifly.in"
              fill
              unoptimized
              className="object-cover object-top"
            />
          </span>
        </a>
        <dl className="mt-4 grid grid-cols-1 gap-y-1.5 font-mono text-[11px] sm:grid-cols-2">
          {[
            ["re-index, no changes", "~17ms"],
            ["vision tokens saved", "90–95%"],
            ["frameworks", "React · Next.js · Flutter"],
            ["where your code goes", "nowhere"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="text-foreground-muted">{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
            unreleased
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted/60">
            rub to reveal
          </span>
        </div>
        <p className="mt-3 max-w-lg text-sm text-foreground-muted">
          Two frames from something I&rsquo;m building. What you see here is a small part of it.
          The real plan is much bigger, and I&rsquo;m not putting it on this page yet.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-lg">
          <BlurReveal src="/work/prototype-1.png" alt="Blurred prototype screen" />
          <BlurReveal src="/work/prototype-2.png" alt="Blurred prototype screen, second frame" />
        </div>
        <p className="mt-4 max-w-lg text-sm text-foreground-muted">
          Prototype screens — don&rsquo;t read the product from them. Most of it isn&rsquo;t here.
        </p>
        <a
          href={`mailto:${profile.email}?subject=The%20unreleased%20one`}
          className="mt-3 inline-block font-mono text-[11px] uppercase tracking-widest text-accent hover:underline hover:underline-offset-4"
        >
          want the full idea, or want to build it with me? mail me ↗
        </a>
      </div>
    </PageShell>
  );
}
