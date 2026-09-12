import Image from "next/image";
import PageShell from "@/components/nav/PageShell";
import DeviceStrip from "@/components/fx/DeviceStrip";
import { workStories } from "@/data/profile";

const CONTEXTIFLY_URL = "https://www.contextifly.in/";
// thum.io renders a screenshot of the live site on request
const CONTEXTIFLY_SHOT = `https://image.thum.io/get/width/1400/${CONTEXTIFLY_URL}`;

const RATROO_URL = "https://ratroo.vercel.app";
const RATROO_REPO = "https://github.com/Sam123336/Ratroo_backend";

// one row, three apps: what a customer sees, then the delivery partner, then the merchant
const FURTILO_SHOTS = [
  ["/work/furtilo-c1-doorstep.webp", "Customer — everything you need, right at your doorstep", "poster"],
  ["/work/furtilo-c2-find.webp", "Customer — location-aware feed, find anything in seconds", "poster"],
  ["/work/furtilo-c3-craving.webp", "Customer — storefront: menu, veg flags, live prices", "poster"],
  ["/work/furtilo-c4-item.webp", "Customer — item detail, straight into the cart", "poster"],
  ["/work/furtilo-c5-tracking.webp", "Customer — live tracking with the OTP handoff code", "poster"],
  ["/work/furtilo-p1-earn.webp", "Delivery partner — flexible hours, daily earnings, weekly rewards", "poster"],
  ["/work/furtilo-p2-week.webp", "Delivery partner — weekly streak and bonuses", "poster"],
  ["/work/furtilo-p3-order.webp", "Delivery partner — pickup, navigate, reach, deliver", "poster"],
  ["/work/furtilo-p4-delivery.webp", "Delivery partner — delivery code, order photo, amount to collect", "poster"],
  ["/work/furtilo-m1-shop.webp", "Merchant — orders, menus, promotions and payouts in one app", "poster"],
  ["/work/furtilo-m2-orders.webp", "Merchant — accept a new order before it auto-cancels", "poster"],
  ["/work/furtilo-m3-prep.webp", "Merchant — set preparation time, get a ready-by estimate", "poster"],
  ["/work/furtilo-m4-menu.webp", "Merchant — menu items and availability toggles", "poster"],
] as const;

// one row, met the way the product is: the planner, the app, then the rider site and the
// ops console behind them
const RATROO_SHOTS = [
  ["/work/ratroo-planner.webp", "ratroo.vercel.app — plan a journey; no account, GPS optional", "laptop"],
  ["/work/ratroo-app-plan.webp", "Plan — options ranked; a wait is marked typical when no times are published", "phone"],
  ["/work/ratroo-app-route.webp", "Route — every stop, with expected times", "phone"],
  ["/work/ratroo-app-nearby.webp", "Nearby — stops around you, one PostGIS query", "phone"],
  ["/work/ratroo-rider-1.webp", "Rider · step 1 — who runs the service; contact details are never shown publicly", "tablet"],
  ["/work/ratroo-rider-2.webp", "Rider · step 2 — bus, mini bus, auto, e-rickshaw or shared taxi", "tablet"],
  ["/work/ratroo-rider-3.webp", "Rider · step 3 — the stops they actually drive, in order, picked on the map", "tablet"],
  ["/work/ratroo-admin.webp", "Ops console — identity, vehicle and route reviewed; nothing is public by default", "laptop"],
] as const;

export default function WorkPage() {
  return (
    <PageShell eyebrow="Work" title="Selected work">
      <p className="-mt-6 mb-10 text-sm text-foreground-muted">
        Five problems, what actually fixed them.
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
            50,000+ users · 300+ signups a day
          </span>
        </div>
        <p className="mt-3 max-w-lg text-sm text-foreground-muted">
          The three apps the stories above ship into: customer, delivery partner and merchant. I
          build the backend behind every one of these screens — serviceability, cart and order
          state, payments and refunds, live tracking.
        </p>
        <DeviceStrip shots={FURTILO_SHOTS} />
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
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
            ratroo
          </h2>
          <span className="flex gap-4 font-mono text-[11px] uppercase tracking-widest">
            <a
              href={RATROO_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-muted transition-colors hover:text-foreground"
            >
              backend source ↗
            </a>
            <a
              href={RATROO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline hover:underline-offset-4"
            >
              visit ↗
            </a>
          </span>
        </div>
        <p className="mt-3 max-w-lg text-sm text-foreground-muted">
          Story 05, live. One project, every screen: the planner on the web and in the Flutter app,
          the rider site where an operator registers a route from wherever they are, and the ops
          console that checks identity, vehicle and route before anyone can see it. All of it reads
          from one ingestion pipeline.
        </p>
        <DeviceStrip shots={RATROO_SHOTS} />

        <dl className="mt-8 grid grid-cols-1 gap-y-1.5 font-mono text-[11px]">
          {[
            ["one pipeline", "fetch → parse → validate → map → canonical"],
            ["stop dedup", "PostGIS ST_DWithin, not string match"],
            ["no times published", "typical wait, never a guess"],
            ["stack", "NestJS · PostGIS · BullMQ · Next.js · Flutter"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="shrink-0 text-foreground-muted">{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PageShell>
  );
}
