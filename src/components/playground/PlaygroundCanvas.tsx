"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSimStore } from "@/store/simStore";
import SimNode from "./SimNode";
import PacketLayer from "./PacketLayer";
import Hud from "./Hud";
import ComponentTray from "./ComponentTray";
import MissionRail from "./MissionRail";
import SqlPanel from "./SqlPanel";
import TopicPicker from "./TopicPicker";
import AmbientBlobs from "@/components/fx/AmbientBlobs";
import type { NodeKind, TrayItem } from "./types";

const nodeTypes = { sim: SimNode };

function Inner({ trayItems }: { trayItems: TrayItem[] }) {
  const nodes = useSimStore((s) => s.nodes);
  const edges = useSimStore((s) => s.edges);
  const onNodesChange = useSimStore((s) => s.onNodesChange);
  const onEdgesChange = useSimStore((s) => s.onEdgesChange);
  const packets = useSimStore((s) => s.packets);
  const addNode = useSimStore((s) => s.addNode);

  return (
    <div
      className="relative h-full w-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("text/plain") as NodeKind;
        if (kind) addNode(kind);
      }}
    >
      <AmbientBlobs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "rgba(56, 189, 248, 0.45)", strokeWidth: 1.5 },
        }}
        className="!bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.5}
          color="rgba(255, 255, 255, 0.09)"
        />
        <Controls
          showInteractive={false}
          className="!border !border-border !bg-bg-elevated [&>button]:!border-border [&>button]:!bg-bg-elevated [&>button]:!fill-foreground"
        />
      </ReactFlow>

      {/* soft vignette so the edges of the canvas fall away */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 60%, rgba(5, 6, 10, 0.55) 100%)",
        }}
      />

      <PacketLayer bursts={packets} />
      <Hud />
      <MissionRail />
      <ComponentTray items={trayItems} />
      <SqlPanel />
      <TopicPicker />
    </div>
  );
}

export default function PlaygroundCanvas(props: { trayItems: TrayItem[] }) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
