"use client";

import { useState } from "react";
import { useSimStore } from "@/store/simStore";
import { runSql } from "@/lib/sim/sql";
import type { Row } from "@/lib/sim/simdb";

const PRESETS = [
  "SELECT * FROM orders",
  "SELECT * FROM orders WHERE status = 'paid'",
  "SELECT * FROM payments",
  "SELECT * FROM webhook_events",
  "SELECT * FROM cache_entries",
];

export default function SqlPanel() {
  const open = useSimStore((s) => s.sqlOpen);
  const toggle = useSimStore((s) => s.toggleSql);
  const db = useSimStore((s) => s.db);
  const [query, setQuery] = useState("SELECT * FROM orders");
  const [result, setResult] = useState<{ columns: string[]; rows: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (q: string) => {
    setQuery(q);
    const r = runSql(q, db);
    if ("error" in r && r.error) {
      setError(r.error);
      setResult(null);
    } else if (!("error" in r)) {
      setError(null);
      setResult(r);
    }
  };

  if (!open) {
    return (
      <button
        onClick={toggle}
        className="node-3d pointer-events-auto absolute bottom-4 right-4 z-30 cursor-pointer rounded-md border border-border px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted backdrop-blur transition-colors hover:border-accent/50 hover:text-accent"
      >
        sql console
      </button>
    );
  }

  return (
    <div className="node-3d pointer-events-auto absolute bottom-4 right-4 z-30 flex max-h-[60%] w-[min(480px,calc(100%-2rem))] flex-col rounded-xl border border-border p-3 font-mono backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-accent">psql · simdb</span>
        <button onClick={toggle} className="cursor-pointer text-xs text-foreground-muted hover:text-foreground">
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => run(p)}
            className="cursor-pointer rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] text-foreground-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            {p.replace("SELECT * FROM ", "")}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-accent">&gt;</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run(query);
          }}
          spellCheck={false}
          aria-label="SQL query"
          className="w-full rounded-md border border-border bg-bg/80 px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-foreground-muted/50 focus:border-accent/60"
          placeholder="SELECT * FROM orders WHERE status = 'paid'"
        />
        <button
          onClick={() => run(query)}
          className="cursor-pointer rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-accent hover:bg-accent/20"
        >
          Run
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-border bg-bg/70 p-2">
        {error && <p className="text-xs text-critical">ERROR: {error}</p>}
        {result && result.rows.length === 0 && <p className="text-xs text-foreground-muted">0 rows</p>}
        {result && result.rows.length > 0 && (
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="border-b border-border pb-1 pr-3 font-semibold uppercase tracking-wider text-accent">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="text-foreground-muted">
                  {result.columns.map((c) => (
                    <td key={c} className="border-b border-border/40 py-1 pr-3 tabular-nums">
                      {row[c] === null ? <span className="text-foreground-muted/40">null</span> : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!result && !error && <p className="text-xs text-foreground-muted">Run a query — the missions write to these tables.</p>}
      </div>
    </div>
  );
}
