"use client";

import { useSimStore } from "@/store/simStore";
import { MISSIONS } from "./types";
import type { Mission } from "@/store/simStore";

export default function MissionRail() {
  const mission = useSimStore((s) => s.mission);
  const maxMission = useSimStore((s) => s.maxMission);
  const setMission = useSimStore((s) => s.setMission);
  const setPicker = useSimStore((s) => s.setPicker);

  return (
    <nav
      aria-label="Missions"
      className="node-3d pointer-events-auto absolute left-1/2 top-4 z-30 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-border px-3 py-2 backdrop-blur lg:flex"
    >
      {MISSIONS.map((m) => {
        const unlocked = m.n <= maxMission;
        const active = m.n === mission;
        return (
          <button
            key={m.n}
            title={`0${m.n} — ${m.title}`}
            disabled={!unlocked}
            onClick={() => setMission(m.n as Mission)}
            className={`h-7 w-7 cursor-pointer rounded-full font-mono text-[10px] transition-all ${
              active
                ? "bg-accent/20 text-accent shadow-[0_0_12px_var(--color-accent-glow)]"
                : unlocked
                  ? "text-foreground-muted hover:bg-surface hover:text-foreground"
                  : "cursor-not-allowed text-foreground-muted/30"
            }`}
          >
            {m.n}
          </button>
        );
      })}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        onClick={() => setPicker(true)}
        className="cursor-pointer rounded-full px-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted transition-colors hover:text-accent"
      >
        topics
      </button>
    </nav>
  );
}
