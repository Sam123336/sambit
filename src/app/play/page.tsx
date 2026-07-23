"use client";

import PlaygroundCanvas from "@/components/playground/PlaygroundCanvas";
import MissionPanel from "@/components/playground/MissionPanel";
import { useSimStore } from "@/store/simStore";
import { TRAY_BY_MISSION } from "@/components/playground/types";

export default function PlayPage() {
  const mission = useSimStore((s) => s.mission);
  const trayItems = TRAY_BY_MISSION[mission] ?? [];

  return (
    <div className="relative h-[calc(100dvh-64px)] md:h-screen">
      <PlaygroundCanvas trayItems={trayItems} />
      <MissionPanel />
    </div>
  );
}
